// Copyright 2009 Ryan Dahl <ry@tinyclouds.org>
#include <node_events.h>

#include <assert.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <errno.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netdb.h>
#include <arpa/inet.h> /* inet_ntop */
#include <netinet/in.h> /* sockaddr_in, sockaddr_in6 */

#include <node.h>
#include <ev.h>
#include <v8.h>

namespace node {

using namespace v8;

Persistent<FunctionTemplate> EventEmitter::constructor_template;

static Persistent<String> events_symbol;
static Persistent<String> exception_catcher_symbol;
static Persistent<String> callbacks_symbol;
static Persistent<String> catchers_symbol;

void EventEmitter::Initialize(Local<FunctionTemplate> ctemplate) {
  HandleScope scope;

  constructor_template = Persistent<FunctionTemplate>::New(ctemplate);

  Local<FunctionTemplate> __emit = FunctionTemplate::New(Emit);
  constructor_template->PrototypeTemplate()->Set(String::NewSymbol("emit"),
      __emit);
  constructor_template->SetClassName(String::NewSymbol("EventEmitter"));

  events_symbol = NODE_PSYMBOL("_events");
  exception_catcher_symbol = NODE_PSYMBOL("_exceptionCatcher");
  callbacks_symbol = NODE_PSYMBOL("callbacks");
  catchers_symbol = NODE_PSYMBOL("catchers");

  // All other prototype methods are defined in events.js
}

static bool ReallyEmit(Handle<Object> self,
                       Handle<String> event,
                       int argc,
                       Handle<Value> argv[]) {
  HandleScope scope;

  Local<Value> events_v = self->Get(events_symbol);
  if (!events_v->IsObject()) return false;
  Local<Object> events = events_v->ToObject();

  Local<Value> listeners_v = events->Get(event);
  if (!listeners_v->IsObject()) return false;
  Local<Object> listeners = Local<Object>::Cast(listeners_v);
  Local<Value> callbacks_v = listeners->Get(callbacks_symbol);
  Local<Value> catchers_v = listeners->Get(catchers_symbol);

  if (!callbacks_v->IsArray() || !catchers_v->IsArray()) return false;
  Local<Array> callbacks = Local<Array>::Cast(callbacks_v);
  Local<Array> catchers = Local<Array>::Cast(catchers_v);
  if (callbacks->Length() != catchers->Length()) return false;

  for (unsigned int i = 0; i < callbacks->Length(); i++) {
    HandleScope scope;

    Local<Value> callback_v = callbacks->Get(Integer::New(i));
    if (!callback_v->IsFunction()) continue;
    Local<Function> callback = Local<Function>::Cast(callback_v);

    Local<Value> catcher = catchers->Get(Integer::New(i));
    SetProcessExceptionCatcher(catcher);

    TryCatch try_catch;

    callback->Call(self, argc, argv);

    if (try_catch.HasCaught()) {
      FatalException(self, try_catch);
      return false;
    }
  }

  return true;
}

Handle<Value> EventEmitter::Emit(const Arguments& args) {
  HandleScope scope;

  if (args.Length() == 0) {
    return ThrowException(Exception::TypeError(
          String::New("Must give event name.")));
  }

  Local<String> event = args[0]->ToString();

  int argc = args.Length() - 1;
  Local<Value> argv[argc];

  for (int i = 0; i < argc; i++) {
    argv[i] = args[i+1];
  }

  bool r = ReallyEmit(args.Holder(), event, argc, argv);

  return scope.Close(r ? True() : False());
}

bool EventEmitter::Emit(Handle<String> event, int argc, Handle<Value> argv[]) {
  HandleScope scope;
  return ReallyEmit(handle_, event, argc, argv);
}

}  // namespace node
