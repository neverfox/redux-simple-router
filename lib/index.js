'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.routeReducer = routeReducer;
exports.syncHistory = syncHistory;
// Constants

var TRANSITION = exports.TRANSITION = '@@router/TRANSITION';
var UPDATE_LOCATION = exports.UPDATE_LOCATION = '@@router/UPDATE_LOCATION';

var SELECT_STATE = function SELECT_STATE(state) {
  return state.routing;
};

function transition(method) {
  return function (arg) {
    return {
      type: TRANSITION,
      method: method, arg: arg
    };
  };
}

var push = exports.push = transition('push');
var replace = exports.replace = transition('replace');

// TODO: Add go, goBack, goForward.

function updateLocation(location) {
  return {
    type: UPDATE_LOCATION,
    location: location
  };
}

// Reducer

var initialState = {
  location: undefined
};

function routeReducer() {
  var state = arguments.length <= 0 || arguments[0] === undefined ? initialState : arguments[0];
  var _ref = arguments[1];
  var type = _ref.type;
  var location = _ref.location;

  if (type !== UPDATE_LOCATION) {
    return state;
  }

  return { location: location };
}

// Syncing

function syncHistory(history) {
  var unsubscribeHistory = undefined,
      currentKey = undefined,
      unsubscribeStore = undefined;
  var connected = false,
      syncing = false;

  function middleware(store) {
    unsubscribeHistory = history.listen(function (location) {
      currentKey = location.key;
      if (syncing) {
        // Don't dispatch a new action if we're replaying location.
        return;
      }

      store.dispatch(updateLocation(location));
    });

    connected = true;

    return function (next) {
      return function (action) {
        if (action.type !== TRANSITION || !connected) {
          next(action);
          return;
        }

        // FIXME: Is it correct to swallow the TRANSITION action here and replace
        // it with UPDATE_LOCATION instead? We could also use the same type in
        // both places instead and just set the location on the action.

        var method = action.method;
        var arg = action.arg;

        history[method](arg);
      };
    };
  }

  middleware.syncHistoryToStore = function (store) {
    var selectRouterState = arguments.length <= 1 || arguments[1] === undefined ? SELECT_STATE : arguments[1];

    var getRouterState = function getRouterState() {
      return selectRouterState(store.getState());
    };

    var _getRouterState = getRouterState();

    var initialLocation = _getRouterState.location;

    unsubscribeStore = store.subscribe(function () {
      var _getRouterState2 = getRouterState();

      var location = _getRouterState2.location;

      // If we're resetting to the beginning, use the saved initial value. We
      // need to dispatch a new action at this point to populate the store
      // appropriately.

      if (!location) {
        history.transitionTo(initialLocation);
        return;
      }

      // Otherwise, if we need to update the history location, do so without
      // dispatching a new action, as we're just bringing history in sync
      // with the store.
      if (location.key !== currentKey) {
        syncing = true;
        history.transitionTo(location);
        syncing = false;
      }
    });
  };

  middleware.unsubscribe = function () {
    unsubscribeHistory();
    if (unsubscribeStore) {
      unsubscribeStore();
    }

    connected = false;
  };

  return middleware;
}
