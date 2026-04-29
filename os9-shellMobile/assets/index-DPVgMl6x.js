(function () {
  const t = document.createElement('link').relList;
  if (t && t.supports && t.supports('modulepreload')) return;
  for (const l of document.querySelectorAll('link[rel="modulepreload"]')) r(l);
  new MutationObserver(l => {
    for (const o of l)
      if (o.type === 'childList')
        for (const u of o.addedNodes) u.tagName === 'LINK' && u.rel === 'modulepreload' && r(u);
  }).observe(document, { childList: !0, subtree: !0 });
  function n(l) {
    const o = {};
    return (
      l.integrity && (o.integrity = l.integrity),
      l.referrerPolicy && (o.referrerPolicy = l.referrerPolicy),
      l.crossOrigin === 'use-credentials'
        ? (o.credentials = 'include')
        : l.crossOrigin === 'anonymous'
          ? (o.credentials = 'omit')
          : (o.credentials = 'same-origin'),
      o
    );
  }
  function r(l) {
    if (l.ep) return;
    l.ep = !0;
    const o = n(l);
    fetch(l.href, o);
  }
})();
function ts(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, 'default') ? e.default : e;
}
var ns = { exports: {} },
  rl = {},
  rs = { exports: {} },
  L = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var Zn = Symbol.for('react.element'),
  Cc = Symbol.for('react.portal'),
  _c = Symbol.for('react.fragment'),
  Nc = Symbol.for('react.strict_mode'),
  Pc = Symbol.for('react.profiler'),
  zc = Symbol.for('react.provider'),
  Tc = Symbol.for('react.context'),
  Lc = Symbol.for('react.forward_ref'),
  jc = Symbol.for('react.suspense'),
  Rc = Symbol.for('react.memo'),
  Oc = Symbol.for('react.lazy'),
  Bu = Symbol.iterator;
function Dc(e) {
  return e === null || typeof e != 'object'
    ? null
    : ((e = (Bu && e[Bu]) || e['@@iterator']), typeof e == 'function' ? e : null);
}
var ls = {
    isMounted: function () {
      return !1;
    },
    enqueueForceUpdate: function () {},
    enqueueReplaceState: function () {},
    enqueueSetState: function () {},
  },
  os = Object.assign,
  us = {};
function on(e, t, n) {
  ((this.props = e), (this.context = t), (this.refs = us), (this.updater = n || ls));
}
on.prototype.isReactComponent = {};
on.prototype.setState = function (e, t) {
  if (typeof e != 'object' && typeof e != 'function' && e != null)
    throw Error(
      'setState(...): takes an object of state variables to update or a function which returns an object of state variables.'
    );
  this.updater.enqueueSetState(this, e, t, 'setState');
};
on.prototype.forceUpdate = function (e) {
  this.updater.enqueueForceUpdate(this, e, 'forceUpdate');
};
function is() {}
is.prototype = on.prototype;
function Ko(e, t, n) {
  ((this.props = e), (this.context = t), (this.refs = us), (this.updater = n || ls));
}
var Go = (Ko.prototype = new is());
Go.constructor = Ko;
os(Go, on.prototype);
Go.isPureReactComponent = !0;
var Wu = Array.isArray,
  ss = Object.prototype.hasOwnProperty,
  Yo = { current: null },
  as = { key: !0, ref: !0, __self: !0, __source: !0 };
function cs(e, t, n) {
  var r,
    l = {},
    o = null,
    u = null;
  if (t != null)
    for (r in (t.ref !== void 0 && (u = t.ref), t.key !== void 0 && (o = '' + t.key), t))
      ss.call(t, r) && !as.hasOwnProperty(r) && (l[r] = t[r]);
  var i = arguments.length - 2;
  if (i === 1) l.children = n;
  else if (1 < i) {
    for (var s = Array(i), c = 0; c < i; c++) s[c] = arguments[c + 2];
    l.children = s;
  }
  if (e && e.defaultProps) for (r in ((i = e.defaultProps), i)) l[r] === void 0 && (l[r] = i[r]);
  return { $$typeof: Zn, type: e, key: o, ref: u, props: l, _owner: Yo.current };
}
function Mc(e, t) {
  return { $$typeof: Zn, type: e.type, key: t, ref: e.ref, props: e.props, _owner: e._owner };
}
function Xo(e) {
  return typeof e == 'object' && e !== null && e.$$typeof === Zn;
}
function Ic(e) {
  var t = { '=': '=0', ':': '=2' };
  return (
    '$' +
    e.replace(/[=:]/g, function (n) {
      return t[n];
    })
  );
}
var Hu = /\/+/g;
function Cl(e, t) {
  return typeof e == 'object' && e !== null && e.key != null ? Ic('' + e.key) : t.toString(36);
}
function kr(e, t, n, r, l) {
  var o = typeof e;
  (o === 'undefined' || o === 'boolean') && (e = null);
  var u = !1;
  if (e === null) u = !0;
  else
    switch (o) {
      case 'string':
      case 'number':
        u = !0;
        break;
      case 'object':
        switch (e.$$typeof) {
          case Zn:
          case Cc:
            u = !0;
        }
    }
  if (u)
    return (
      (u = e),
      (l = l(u)),
      (e = r === '' ? '.' + Cl(u, 0) : r),
      Wu(l)
        ? ((n = ''),
          e != null && (n = e.replace(Hu, '$&/') + '/'),
          kr(l, t, n, '', function (c) {
            return c;
          }))
        : l != null &&
          (Xo(l) &&
            (l = Mc(
              l,
              n +
                (!l.key || (u && u.key === l.key) ? '' : ('' + l.key).replace(Hu, '$&/') + '/') +
                e
            )),
          t.push(l)),
      1
    );
  if (((u = 0), (r = r === '' ? '.' : r + ':'), Wu(e)))
    for (var i = 0; i < e.length; i++) {
      o = e[i];
      var s = r + Cl(o, i);
      u += kr(o, t, n, s, l);
    }
  else if (((s = Dc(e)), typeof s == 'function'))
    for (e = s.call(e), i = 0; !(o = e.next()).done; )
      ((o = o.value), (s = r + Cl(o, i++)), (u += kr(o, t, n, s, l)));
  else if (o === 'object')
    throw (
      (t = String(e)),
      Error(
        'Objects are not valid as a React child (found: ' +
          (t === '[object Object]' ? 'object with keys {' + Object.keys(e).join(', ') + '}' : t) +
          '). If you meant to render a collection of children, use an array instead.'
      )
    );
  return u;
}
function lr(e, t, n) {
  if (e == null) return e;
  var r = [],
    l = 0;
  return (
    kr(e, r, '', '', function (o) {
      return t.call(n, o, l++);
    }),
    r
  );
}
function Fc(e) {
  if (e._status === -1) {
    var t = e._result;
    ((t = t()),
      t.then(
        function (n) {
          (e._status === 0 || e._status === -1) && ((e._status = 1), (e._result = n));
        },
        function (n) {
          (e._status === 0 || e._status === -1) && ((e._status = 2), (e._result = n));
        }
      ),
      e._status === -1 && ((e._status = 0), (e._result = t)));
  }
  if (e._status === 1) return e._result.default;
  throw e._result;
}
var se = { current: null },
  xr = { transition: null },
  Ac = { ReactCurrentDispatcher: se, ReactCurrentBatchConfig: xr, ReactCurrentOwner: Yo };
function fs() {
  throw Error('act(...) is not supported in production builds of React.');
}
L.Children = {
  map: lr,
  forEach: function (e, t, n) {
    lr(
      e,
      function () {
        t.apply(this, arguments);
      },
      n
    );
  },
  count: function (e) {
    var t = 0;
    return (
      lr(e, function () {
        t++;
      }),
      t
    );
  },
  toArray: function (e) {
    return (
      lr(e, function (t) {
        return t;
      }) || []
    );
  },
  only: function (e) {
    if (!Xo(e))
      throw Error('React.Children.only expected to receive a single React element child.');
    return e;
  },
};
L.Component = on;
L.Fragment = _c;
L.Profiler = Pc;
L.PureComponent = Ko;
L.StrictMode = Nc;
L.Suspense = jc;
L.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Ac;
L.act = fs;
L.cloneElement = function (e, t, n) {
  if (e == null)
    throw Error(
      'React.cloneElement(...): The argument must be a React element, but you passed ' + e + '.'
    );
  var r = os({}, e.props),
    l = e.key,
    o = e.ref,
    u = e._owner;
  if (t != null) {
    if (
      (t.ref !== void 0 && ((o = t.ref), (u = Yo.current)),
      t.key !== void 0 && (l = '' + t.key),
      e.type && e.type.defaultProps)
    )
      var i = e.type.defaultProps;
    for (s in t)
      ss.call(t, s) &&
        !as.hasOwnProperty(s) &&
        (r[s] = t[s] === void 0 && i !== void 0 ? i[s] : t[s]);
  }
  var s = arguments.length - 2;
  if (s === 1) r.children = n;
  else if (1 < s) {
    i = Array(s);
    for (var c = 0; c < s; c++) i[c] = arguments[c + 2];
    r.children = i;
  }
  return { $$typeof: Zn, type: e.type, key: l, ref: o, props: r, _owner: u };
};
L.createContext = function (e) {
  return (
    (e = {
      $$typeof: Tc,
      _currentValue: e,
      _currentValue2: e,
      _threadCount: 0,
      Provider: null,
      Consumer: null,
      _defaultValue: null,
      _globalName: null,
    }),
    (e.Provider = { $$typeof: zc, _context: e }),
    (e.Consumer = e)
  );
};
L.createElement = cs;
L.createFactory = function (e) {
  var t = cs.bind(null, e);
  return ((t.type = e), t);
};
L.createRef = function () {
  return { current: null };
};
L.forwardRef = function (e) {
  return { $$typeof: Lc, render: e };
};
L.isValidElement = Xo;
L.lazy = function (e) {
  return { $$typeof: Oc, _payload: { _status: -1, _result: e }, _init: Fc };
};
L.memo = function (e, t) {
  return { $$typeof: Rc, type: e, compare: t === void 0 ? null : t };
};
L.startTransition = function (e) {
  var t = xr.transition;
  xr.transition = {};
  try {
    e();
  } finally {
    xr.transition = t;
  }
};
L.unstable_act = fs;
L.useCallback = function (e, t) {
  return se.current.useCallback(e, t);
};
L.useContext = function (e) {
  return se.current.useContext(e);
};
L.useDebugValue = function () {};
L.useDeferredValue = function (e) {
  return se.current.useDeferredValue(e);
};
L.useEffect = function (e, t) {
  return se.current.useEffect(e, t);
};
L.useId = function () {
  return se.current.useId();
};
L.useImperativeHandle = function (e, t, n) {
  return se.current.useImperativeHandle(e, t, n);
};
L.useInsertionEffect = function (e, t) {
  return se.current.useInsertionEffect(e, t);
};
L.useLayoutEffect = function (e, t) {
  return se.current.useLayoutEffect(e, t);
};
L.useMemo = function (e, t) {
  return se.current.useMemo(e, t);
};
L.useReducer = function (e, t, n) {
  return se.current.useReducer(e, t, n);
};
L.useRef = function (e) {
  return se.current.useRef(e);
};
L.useState = function (e) {
  return se.current.useState(e);
};
L.useSyncExternalStore = function (e, t, n) {
  return se.current.useSyncExternalStore(e, t, n);
};
L.useTransition = function () {
  return se.current.useTransition();
};
L.version = '18.3.1';
rs.exports = L;
var K = rs.exports;
const ds = ts(K);
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var Uc = K,
  Vc = Symbol.for('react.element'),
  $c = Symbol.for('react.fragment'),
  Bc = Object.prototype.hasOwnProperty,
  Wc = Uc.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
  Hc = { key: !0, ref: !0, __self: !0, __source: !0 };
function ps(e, t, n) {
  var r,
    l = {},
    o = null,
    u = null;
  (n !== void 0 && (o = '' + n),
    t.key !== void 0 && (o = '' + t.key),
    t.ref !== void 0 && (u = t.ref));
  for (r in t) Bc.call(t, r) && !Hc.hasOwnProperty(r) && (l[r] = t[r]);
  if (e && e.defaultProps) for (r in ((t = e.defaultProps), t)) l[r] === void 0 && (l[r] = t[r]);
  return { $$typeof: Vc, type: e, key: o, ref: u, props: l, _owner: Wc.current };
}
rl.Fragment = $c;
rl.jsx = ps;
rl.jsxs = ps;
ns.exports = rl;
var P = ns.exports,
  Jl = {},
  ms = { exports: {} },
  we = {},
  hs = { exports: {} },
  vs = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ (function (e) {
  function t(E, z) {
    var T = E.length;
    E.push(z);
    e: for (; 0 < T; ) {
      var H = (T - 1) >>> 1,
        Z = E[H];
      if (0 < l(Z, z)) ((E[H] = z), (E[T] = Z), (T = H));
      else break e;
    }
  }
  function n(E) {
    return E.length === 0 ? null : E[0];
  }
  function r(E) {
    if (E.length === 0) return null;
    var z = E[0],
      T = E.pop();
    if (T !== z) {
      E[0] = T;
      e: for (var H = 0, Z = E.length, nr = Z >>> 1; H < nr; ) {
        var vt = 2 * (H + 1) - 1,
          El = E[vt],
          yt = vt + 1,
          rr = E[yt];
        if (0 > l(El, T))
          yt < Z && 0 > l(rr, El)
            ? ((E[H] = rr), (E[yt] = T), (H = yt))
            : ((E[H] = El), (E[vt] = T), (H = vt));
        else if (yt < Z && 0 > l(rr, T)) ((E[H] = rr), (E[yt] = T), (H = yt));
        else break e;
      }
    }
    return z;
  }
  function l(E, z) {
    var T = E.sortIndex - z.sortIndex;
    return T !== 0 ? T : E.id - z.id;
  }
  if (typeof performance == 'object' && typeof performance.now == 'function') {
    var o = performance;
    e.unstable_now = function () {
      return o.now();
    };
  } else {
    var u = Date,
      i = u.now();
    e.unstable_now = function () {
      return u.now() - i;
    };
  }
  var s = [],
    c = [],
    m = 1,
    h = null,
    p = 3,
    g = !1,
    w = !1,
    S = !1,
    F = typeof setTimeout == 'function' ? setTimeout : null,
    f = typeof clearTimeout == 'function' ? clearTimeout : null,
    a = typeof setImmediate < 'u' ? setImmediate : null;
  typeof navigator < 'u' &&
    navigator.scheduling !== void 0 &&
    navigator.scheduling.isInputPending !== void 0 &&
    navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function d(E) {
    for (var z = n(c); z !== null; ) {
      if (z.callback === null) r(c);
      else if (z.startTime <= E) (r(c), (z.sortIndex = z.expirationTime), t(s, z));
      else break;
      z = n(c);
    }
  }
  function v(E) {
    if (((S = !1), d(E), !w))
      if (n(s) !== null) ((w = !0), kl(x));
      else {
        var z = n(c);
        z !== null && xl(v, z.startTime - E);
      }
  }
  function x(E, z) {
    ((w = !1), S && ((S = !1), f(N), (N = -1)), (g = !0));
    var T = p;
    try {
      for (d(z), h = n(s); h !== null && (!(h.expirationTime > z) || (E && !Pe())); ) {
        var H = h.callback;
        if (typeof H == 'function') {
          ((h.callback = null), (p = h.priorityLevel));
          var Z = H(h.expirationTime <= z);
          ((z = e.unstable_now()),
            typeof Z == 'function' ? (h.callback = Z) : h === n(s) && r(s),
            d(z));
        } else r(s);
        h = n(s);
      }
      if (h !== null) var nr = !0;
      else {
        var vt = n(c);
        (vt !== null && xl(v, vt.startTime - z), (nr = !1));
      }
      return nr;
    } finally {
      ((h = null), (p = T), (g = !1));
    }
  }
  var C = !1,
    _ = null,
    N = -1,
    W = 5,
    j = -1;
  function Pe() {
    return !(e.unstable_now() - j < W);
  }
  function an() {
    if (_ !== null) {
      var E = e.unstable_now();
      j = E;
      var z = !0;
      try {
        z = _(!0, E);
      } finally {
        z ? cn() : ((C = !1), (_ = null));
      }
    } else C = !1;
  }
  var cn;
  if (typeof a == 'function')
    cn = function () {
      a(an);
    };
  else if (typeof MessageChannel < 'u') {
    var $u = new MessageChannel(),
      Ec = $u.port2;
    (($u.port1.onmessage = an),
      (cn = function () {
        Ec.postMessage(null);
      }));
  } else
    cn = function () {
      F(an, 0);
    };
  function kl(E) {
    ((_ = E), C || ((C = !0), cn()));
  }
  function xl(E, z) {
    N = F(function () {
      E(e.unstable_now());
    }, z);
  }
  ((e.unstable_IdlePriority = 5),
    (e.unstable_ImmediatePriority = 1),
    (e.unstable_LowPriority = 4),
    (e.unstable_NormalPriority = 3),
    (e.unstable_Profiling = null),
    (e.unstable_UserBlockingPriority = 2),
    (e.unstable_cancelCallback = function (E) {
      E.callback = null;
    }),
    (e.unstable_continueExecution = function () {
      w || g || ((w = !0), kl(x));
    }),
    (e.unstable_forceFrameRate = function (E) {
      0 > E || 125 < E
        ? console.error(
            'forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported'
          )
        : (W = 0 < E ? Math.floor(1e3 / E) : 5);
    }),
    (e.unstable_getCurrentPriorityLevel = function () {
      return p;
    }),
    (e.unstable_getFirstCallbackNode = function () {
      return n(s);
    }),
    (e.unstable_next = function (E) {
      switch (p) {
        case 1:
        case 2:
        case 3:
          var z = 3;
          break;
        default:
          z = p;
      }
      var T = p;
      p = z;
      try {
        return E();
      } finally {
        p = T;
      }
    }),
    (e.unstable_pauseExecution = function () {}),
    (e.unstable_requestPaint = function () {}),
    (e.unstable_runWithPriority = function (E, z) {
      switch (E) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          E = 3;
      }
      var T = p;
      p = E;
      try {
        return z();
      } finally {
        p = T;
      }
    }),
    (e.unstable_scheduleCallback = function (E, z, T) {
      var H = e.unstable_now();
      switch (
        (typeof T == 'object' && T !== null
          ? ((T = T.delay), (T = typeof T == 'number' && 0 < T ? H + T : H))
          : (T = H),
        E)
      ) {
        case 1:
          var Z = -1;
          break;
        case 2:
          Z = 250;
          break;
        case 5:
          Z = 1073741823;
          break;
        case 4:
          Z = 1e4;
          break;
        default:
          Z = 5e3;
      }
      return (
        (Z = T + Z),
        (E = {
          id: m++,
          callback: z,
          priorityLevel: E,
          startTime: T,
          expirationTime: Z,
          sortIndex: -1,
        }),
        T > H
          ? ((E.sortIndex = T),
            t(c, E),
            n(s) === null && E === n(c) && (S ? (f(N), (N = -1)) : (S = !0), xl(v, T - H)))
          : ((E.sortIndex = Z), t(s, E), w || g || ((w = !0), kl(x))),
        E
      );
    }),
    (e.unstable_shouldYield = Pe),
    (e.unstable_wrapCallback = function (E) {
      var z = p;
      return function () {
        var T = p;
        p = z;
        try {
          return E.apply(this, arguments);
        } finally {
          p = T;
        }
      };
    }));
})(vs);
hs.exports = vs;
var Qc = hs.exports;
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var Kc = K,
  ge = Qc;
function y(e) {
  for (
    var t = 'https://reactjs.org/docs/error-decoder.html?invariant=' + e, n = 1;
    n < arguments.length;
    n++
  )
    t += '&args[]=' + encodeURIComponent(arguments[n]);
  return (
    'Minified React error #' +
    e +
    '; visit ' +
    t +
    ' for the full message or use the non-minified dev environment for full errors and additional helpful warnings.'
  );
}
var ys = new Set(),
  Rn = {};
function Lt(e, t) {
  (Jt(e, t), Jt(e + 'Capture', t));
}
function Jt(e, t) {
  for (Rn[e] = t, e = 0; e < t.length; e++) ys.add(t[e]);
}
var Qe = !(
    typeof window > 'u' ||
    typeof window.document > 'u' ||
    typeof window.document.createElement > 'u'
  ),
  ql = Object.prototype.hasOwnProperty,
  Gc =
    /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,
  Qu = {},
  Ku = {};
function Yc(e) {
  return ql.call(Ku, e) ? !0 : ql.call(Qu, e) ? !1 : Gc.test(e) ? (Ku[e] = !0) : ((Qu[e] = !0), !1);
}
function Xc(e, t, n, r) {
  if (n !== null && n.type === 0) return !1;
  switch (typeof t) {
    case 'function':
    case 'symbol':
      return !0;
    case 'boolean':
      return r
        ? !1
        : n !== null
          ? !n.acceptsBooleans
          : ((e = e.toLowerCase().slice(0, 5)), e !== 'data-' && e !== 'aria-');
    default:
      return !1;
  }
}
function Zc(e, t, n, r) {
  if (t === null || typeof t > 'u' || Xc(e, t, n, r)) return !0;
  if (r) return !1;
  if (n !== null)
    switch (n.type) {
      case 3:
        return !t;
      case 4:
        return t === !1;
      case 5:
        return isNaN(t);
      case 6:
        return isNaN(t) || 1 > t;
    }
  return !1;
}
function ae(e, t, n, r, l, o, u) {
  ((this.acceptsBooleans = t === 2 || t === 3 || t === 4),
    (this.attributeName = r),
    (this.attributeNamespace = l),
    (this.mustUseProperty = n),
    (this.propertyName = e),
    (this.type = t),
    (this.sanitizeURL = o),
    (this.removeEmptyString = u));
}
var te = {};
'children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style'
  .split(' ')
  .forEach(function (e) {
    te[e] = new ae(e, 0, !1, e, null, !1, !1);
  });
[
  ['acceptCharset', 'accept-charset'],
  ['className', 'class'],
  ['htmlFor', 'for'],
  ['httpEquiv', 'http-equiv'],
].forEach(function (e) {
  var t = e[0];
  te[t] = new ae(t, 1, !1, e[1], null, !1, !1);
});
['contentEditable', 'draggable', 'spellCheck', 'value'].forEach(function (e) {
  te[e] = new ae(e, 2, !1, e.toLowerCase(), null, !1, !1);
});
['autoReverse', 'externalResourcesRequired', 'focusable', 'preserveAlpha'].forEach(function (e) {
  te[e] = new ae(e, 2, !1, e, null, !1, !1);
});
'allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope'
  .split(' ')
  .forEach(function (e) {
    te[e] = new ae(e, 3, !1, e.toLowerCase(), null, !1, !1);
  });
['checked', 'multiple', 'muted', 'selected'].forEach(function (e) {
  te[e] = new ae(e, 3, !0, e, null, !1, !1);
});
['capture', 'download'].forEach(function (e) {
  te[e] = new ae(e, 4, !1, e, null, !1, !1);
});
['cols', 'rows', 'size', 'span'].forEach(function (e) {
  te[e] = new ae(e, 6, !1, e, null, !1, !1);
});
['rowSpan', 'start'].forEach(function (e) {
  te[e] = new ae(e, 5, !1, e.toLowerCase(), null, !1, !1);
});
var Zo = /[\-:]([a-z])/g;
function Jo(e) {
  return e[1].toUpperCase();
}
'accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height'
  .split(' ')
  .forEach(function (e) {
    var t = e.replace(Zo, Jo);
    te[t] = new ae(t, 1, !1, e, null, !1, !1);
  });
'xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type'
  .split(' ')
  .forEach(function (e) {
    var t = e.replace(Zo, Jo);
    te[t] = new ae(t, 1, !1, e, 'http://www.w3.org/1999/xlink', !1, !1);
  });
['xml:base', 'xml:lang', 'xml:space'].forEach(function (e) {
  var t = e.replace(Zo, Jo);
  te[t] = new ae(t, 1, !1, e, 'http://www.w3.org/XML/1998/namespace', !1, !1);
});
['tabIndex', 'crossOrigin'].forEach(function (e) {
  te[e] = new ae(e, 1, !1, e.toLowerCase(), null, !1, !1);
});
te.xlinkHref = new ae('xlinkHref', 1, !1, 'xlink:href', 'http://www.w3.org/1999/xlink', !0, !1);
['src', 'href', 'action', 'formAction'].forEach(function (e) {
  te[e] = new ae(e, 1, !1, e.toLowerCase(), null, !0, !0);
});
function qo(e, t, n, r) {
  var l = te.hasOwnProperty(t) ? te[t] : null;
  (l !== null
    ? l.type !== 0
    : r || !(2 < t.length) || (t[0] !== 'o' && t[0] !== 'O') || (t[1] !== 'n' && t[1] !== 'N')) &&
    (Zc(t, n, l, r) && (n = null),
    r || l === null
      ? Yc(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, '' + n))
      : l.mustUseProperty
        ? (e[l.propertyName] = n === null ? (l.type === 3 ? !1 : '') : n)
        : ((t = l.attributeName),
          (r = l.attributeNamespace),
          n === null
            ? e.removeAttribute(t)
            : ((l = l.type),
              (n = l === 3 || (l === 4 && n === !0) ? '' : '' + n),
              r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
}
var Xe = Kc.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
  or = Symbol.for('react.element'),
  Ot = Symbol.for('react.portal'),
  Dt = Symbol.for('react.fragment'),
  bo = Symbol.for('react.strict_mode'),
  bl = Symbol.for('react.profiler'),
  gs = Symbol.for('react.provider'),
  ws = Symbol.for('react.context'),
  eu = Symbol.for('react.forward_ref'),
  eo = Symbol.for('react.suspense'),
  to = Symbol.for('react.suspense_list'),
  tu = Symbol.for('react.memo'),
  Je = Symbol.for('react.lazy'),
  Ss = Symbol.for('react.offscreen'),
  Gu = Symbol.iterator;
function fn(e) {
  return e === null || typeof e != 'object'
    ? null
    : ((e = (Gu && e[Gu]) || e['@@iterator']), typeof e == 'function' ? e : null);
}
var $ = Object.assign,
  _l;
function wn(e) {
  if (_l === void 0)
    try {
      throw Error();
    } catch (n) {
      var t = n.stack.trim().match(/\n( *(at )?)/);
      _l = (t && t[1]) || '';
    }
  return (
    `
` +
    _l +
    e
  );
}
var Nl = !1;
function Pl(e, t) {
  if (!e || Nl) return '';
  Nl = !0;
  var n = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    if (t)
      if (
        ((t = function () {
          throw Error();
        }),
        Object.defineProperty(t.prototype, 'props', {
          set: function () {
            throw Error();
          },
        }),
        typeof Reflect == 'object' && Reflect.construct)
      ) {
        try {
          Reflect.construct(t, []);
        } catch (c) {
          var r = c;
        }
        Reflect.construct(e, [], t);
      } else {
        try {
          t.call();
        } catch (c) {
          r = c;
        }
        e.call(t.prototype);
      }
    else {
      try {
        throw Error();
      } catch (c) {
        r = c;
      }
      e();
    }
  } catch (c) {
    if (c && r && typeof c.stack == 'string') {
      for (
        var l = c.stack.split(`
`),
          o = r.stack.split(`
`),
          u = l.length - 1,
          i = o.length - 1;
        1 <= u && 0 <= i && l[u] !== o[i];
      )
        i--;
      for (; 1 <= u && 0 <= i; u--, i--)
        if (l[u] !== o[i]) {
          if (u !== 1 || i !== 1)
            do
              if ((u--, i--, 0 > i || l[u] !== o[i])) {
                var s =
                  `
` + l[u].replace(' at new ', ' at ');
                return (
                  e.displayName &&
                    s.includes('<anonymous>') &&
                    (s = s.replace('<anonymous>', e.displayName)),
                  s
                );
              }
            while (1 <= u && 0 <= i);
          break;
        }
    }
  } finally {
    ((Nl = !1), (Error.prepareStackTrace = n));
  }
  return (e = e ? e.displayName || e.name : '') ? wn(e) : '';
}
function Jc(e) {
  switch (e.tag) {
    case 5:
      return wn(e.type);
    case 16:
      return wn('Lazy');
    case 13:
      return wn('Suspense');
    case 19:
      return wn('SuspenseList');
    case 0:
    case 2:
    case 15:
      return ((e = Pl(e.type, !1)), e);
    case 11:
      return ((e = Pl(e.type.render, !1)), e);
    case 1:
      return ((e = Pl(e.type, !0)), e);
    default:
      return '';
  }
}
function no(e) {
  if (e == null) return null;
  if (typeof e == 'function') return e.displayName || e.name || null;
  if (typeof e == 'string') return e;
  switch (e) {
    case Dt:
      return 'Fragment';
    case Ot:
      return 'Portal';
    case bl:
      return 'Profiler';
    case bo:
      return 'StrictMode';
    case eo:
      return 'Suspense';
    case to:
      return 'SuspenseList';
  }
  if (typeof e == 'object')
    switch (e.$$typeof) {
      case ws:
        return (e.displayName || 'Context') + '.Consumer';
      case gs:
        return (e._context.displayName || 'Context') + '.Provider';
      case eu:
        var t = e.render;
        return (
          (e = e.displayName),
          e ||
            ((e = t.displayName || t.name || ''),
            (e = e !== '' ? 'ForwardRef(' + e + ')' : 'ForwardRef')),
          e
        );
      case tu:
        return ((t = e.displayName || null), t !== null ? t : no(e.type) || 'Memo');
      case Je:
        ((t = e._payload), (e = e._init));
        try {
          return no(e(t));
        } catch {}
    }
  return null;
}
function qc(e) {
  var t = e.type;
  switch (e.tag) {
    case 24:
      return 'Cache';
    case 9:
      return (t.displayName || 'Context') + '.Consumer';
    case 10:
      return (t._context.displayName || 'Context') + '.Provider';
    case 18:
      return 'DehydratedFragment';
    case 11:
      return (
        (e = t.render),
        (e = e.displayName || e.name || ''),
        t.displayName || (e !== '' ? 'ForwardRef(' + e + ')' : 'ForwardRef')
      );
    case 7:
      return 'Fragment';
    case 5:
      return t;
    case 4:
      return 'Portal';
    case 3:
      return 'Root';
    case 6:
      return 'Text';
    case 16:
      return no(t);
    case 8:
      return t === bo ? 'StrictMode' : 'Mode';
    case 22:
      return 'Offscreen';
    case 12:
      return 'Profiler';
    case 21:
      return 'Scope';
    case 13:
      return 'Suspense';
    case 19:
      return 'SuspenseList';
    case 25:
      return 'TracingMarker';
    case 1:
    case 0:
    case 17:
    case 2:
    case 14:
    case 15:
      if (typeof t == 'function') return t.displayName || t.name || null;
      if (typeof t == 'string') return t;
  }
  return null;
}
function ft(e) {
  switch (typeof e) {
    case 'boolean':
    case 'number':
    case 'string':
    case 'undefined':
      return e;
    case 'object':
      return e;
    default:
      return '';
  }
}
function ks(e) {
  var t = e.type;
  return (e = e.nodeName) && e.toLowerCase() === 'input' && (t === 'checkbox' || t === 'radio');
}
function bc(e) {
  var t = ks(e) ? 'checked' : 'value',
    n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t),
    r = '' + e[t];
  if (
    !e.hasOwnProperty(t) &&
    typeof n < 'u' &&
    typeof n.get == 'function' &&
    typeof n.set == 'function'
  ) {
    var l = n.get,
      o = n.set;
    return (
      Object.defineProperty(e, t, {
        configurable: !0,
        get: function () {
          return l.call(this);
        },
        set: function (u) {
          ((r = '' + u), o.call(this, u));
        },
      }),
      Object.defineProperty(e, t, { enumerable: n.enumerable }),
      {
        getValue: function () {
          return r;
        },
        setValue: function (u) {
          r = '' + u;
        },
        stopTracking: function () {
          ((e._valueTracker = null), delete e[t]);
        },
      }
    );
  }
}
function ur(e) {
  e._valueTracker || (e._valueTracker = bc(e));
}
function xs(e) {
  if (!e) return !1;
  var t = e._valueTracker;
  if (!t) return !0;
  var n = t.getValue(),
    r = '';
  return (
    e && (r = ks(e) ? (e.checked ? 'true' : 'false') : e.value),
    (e = r),
    e !== n ? (t.setValue(e), !0) : !1
  );
}
function Or(e) {
  if (((e = e || (typeof document < 'u' ? document : void 0)), typeof e > 'u')) return null;
  try {
    return e.activeElement || e.body;
  } catch {
    return e.body;
  }
}
function ro(e, t) {
  var n = t.checked;
  return $({}, t, {
    defaultChecked: void 0,
    defaultValue: void 0,
    value: void 0,
    checked: n ?? e._wrapperState.initialChecked,
  });
}
function Yu(e, t) {
  var n = t.defaultValue == null ? '' : t.defaultValue,
    r = t.checked != null ? t.checked : t.defaultChecked;
  ((n = ft(t.value != null ? t.value : n)),
    (e._wrapperState = {
      initialChecked: r,
      initialValue: n,
      controlled: t.type === 'checkbox' || t.type === 'radio' ? t.checked != null : t.value != null,
    }));
}
function Es(e, t) {
  ((t = t.checked), t != null && qo(e, 'checked', t, !1));
}
function lo(e, t) {
  Es(e, t);
  var n = ft(t.value),
    r = t.type;
  if (n != null)
    r === 'number'
      ? ((n === 0 && e.value === '') || e.value != n) && (e.value = '' + n)
      : e.value !== '' + n && (e.value = '' + n);
  else if (r === 'submit' || r === 'reset') {
    e.removeAttribute('value');
    return;
  }
  (t.hasOwnProperty('value')
    ? oo(e, t.type, n)
    : t.hasOwnProperty('defaultValue') && oo(e, t.type, ft(t.defaultValue)),
    t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked));
}
function Xu(e, t, n) {
  if (t.hasOwnProperty('value') || t.hasOwnProperty('defaultValue')) {
    var r = t.type;
    if (!((r !== 'submit' && r !== 'reset') || (t.value !== void 0 && t.value !== null))) return;
    ((t = '' + e._wrapperState.initialValue),
      n || t === e.value || (e.value = t),
      (e.defaultValue = t));
  }
  ((n = e.name),
    n !== '' && (e.name = ''),
    (e.defaultChecked = !!e._wrapperState.initialChecked),
    n !== '' && (e.name = n));
}
function oo(e, t, n) {
  (t !== 'number' || Or(e.ownerDocument) !== e) &&
    (n == null
      ? (e.defaultValue = '' + e._wrapperState.initialValue)
      : e.defaultValue !== '' + n && (e.defaultValue = '' + n));
}
var Sn = Array.isArray;
function Qt(e, t, n, r) {
  if (((e = e.options), t)) {
    t = {};
    for (var l = 0; l < n.length; l++) t['$' + n[l]] = !0;
    for (n = 0; n < e.length; n++)
      ((l = t.hasOwnProperty('$' + e[n].value)),
        e[n].selected !== l && (e[n].selected = l),
        l && r && (e[n].defaultSelected = !0));
  } else {
    for (n = '' + ft(n), t = null, l = 0; l < e.length; l++) {
      if (e[l].value === n) {
        ((e[l].selected = !0), r && (e[l].defaultSelected = !0));
        return;
      }
      t !== null || e[l].disabled || (t = e[l]);
    }
    t !== null && (t.selected = !0);
  }
}
function uo(e, t) {
  if (t.dangerouslySetInnerHTML != null) throw Error(y(91));
  return $({}, t, {
    value: void 0,
    defaultValue: void 0,
    children: '' + e._wrapperState.initialValue,
  });
}
function Zu(e, t) {
  var n = t.value;
  if (n == null) {
    if (((n = t.children), (t = t.defaultValue), n != null)) {
      if (t != null) throw Error(y(92));
      if (Sn(n)) {
        if (1 < n.length) throw Error(y(93));
        n = n[0];
      }
      t = n;
    }
    (t == null && (t = ''), (n = t));
  }
  e._wrapperState = { initialValue: ft(n) };
}
function Cs(e, t) {
  var n = ft(t.value),
    r = ft(t.defaultValue);
  (n != null &&
    ((n = '' + n),
    n !== e.value && (e.value = n),
    t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)),
    r != null && (e.defaultValue = '' + r));
}
function Ju(e) {
  var t = e.textContent;
  t === e._wrapperState.initialValue && t !== '' && t !== null && (e.value = t);
}
function _s(e) {
  switch (e) {
    case 'svg':
      return 'http://www.w3.org/2000/svg';
    case 'math':
      return 'http://www.w3.org/1998/Math/MathML';
    default:
      return 'http://www.w3.org/1999/xhtml';
  }
}
function io(e, t) {
  return e == null || e === 'http://www.w3.org/1999/xhtml'
    ? _s(t)
    : e === 'http://www.w3.org/2000/svg' && t === 'foreignObject'
      ? 'http://www.w3.org/1999/xhtml'
      : e;
}
var ir,
  Ns = (function (e) {
    return typeof MSApp < 'u' && MSApp.execUnsafeLocalFunction
      ? function (t, n, r, l) {
          MSApp.execUnsafeLocalFunction(function () {
            return e(t, n, r, l);
          });
        }
      : e;
  })(function (e, t) {
    if (e.namespaceURI !== 'http://www.w3.org/2000/svg' || 'innerHTML' in e) e.innerHTML = t;
    else {
      for (
        ir = ir || document.createElement('div'),
          ir.innerHTML = '<svg>' + t.valueOf().toString() + '</svg>',
          t = ir.firstChild;
        e.firstChild;
      )
        e.removeChild(e.firstChild);
      for (; t.firstChild; ) e.appendChild(t.firstChild);
    }
  });
function On(e, t) {
  if (t) {
    var n = e.firstChild;
    if (n && n === e.lastChild && n.nodeType === 3) {
      n.nodeValue = t;
      return;
    }
  }
  e.textContent = t;
}
var En = {
    animationIterationCount: !0,
    aspectRatio: !0,
    borderImageOutset: !0,
    borderImageSlice: !0,
    borderImageWidth: !0,
    boxFlex: !0,
    boxFlexGroup: !0,
    boxOrdinalGroup: !0,
    columnCount: !0,
    columns: !0,
    flex: !0,
    flexGrow: !0,
    flexPositive: !0,
    flexShrink: !0,
    flexNegative: !0,
    flexOrder: !0,
    gridArea: !0,
    gridRow: !0,
    gridRowEnd: !0,
    gridRowSpan: !0,
    gridRowStart: !0,
    gridColumn: !0,
    gridColumnEnd: !0,
    gridColumnSpan: !0,
    gridColumnStart: !0,
    fontWeight: !0,
    lineClamp: !0,
    lineHeight: !0,
    opacity: !0,
    order: !0,
    orphans: !0,
    tabSize: !0,
    widows: !0,
    zIndex: !0,
    zoom: !0,
    fillOpacity: !0,
    floodOpacity: !0,
    stopOpacity: !0,
    strokeDasharray: !0,
    strokeDashoffset: !0,
    strokeMiterlimit: !0,
    strokeOpacity: !0,
    strokeWidth: !0,
  },
  ef = ['Webkit', 'ms', 'Moz', 'O'];
Object.keys(En).forEach(function (e) {
  ef.forEach(function (t) {
    ((t = t + e.charAt(0).toUpperCase() + e.substring(1)), (En[t] = En[e]));
  });
});
function Ps(e, t, n) {
  return t == null || typeof t == 'boolean' || t === ''
    ? ''
    : n || typeof t != 'number' || t === 0 || (En.hasOwnProperty(e) && En[e])
      ? ('' + t).trim()
      : t + 'px';
}
function zs(e, t) {
  e = e.style;
  for (var n in t)
    if (t.hasOwnProperty(n)) {
      var r = n.indexOf('--') === 0,
        l = Ps(n, t[n], r);
      (n === 'float' && (n = 'cssFloat'), r ? e.setProperty(n, l) : (e[n] = l));
    }
}
var tf = $(
  { menuitem: !0 },
  {
    area: !0,
    base: !0,
    br: !0,
    col: !0,
    embed: !0,
    hr: !0,
    img: !0,
    input: !0,
    keygen: !0,
    link: !0,
    meta: !0,
    param: !0,
    source: !0,
    track: !0,
    wbr: !0,
  }
);
function so(e, t) {
  if (t) {
    if (tf[e] && (t.children != null || t.dangerouslySetInnerHTML != null)) throw Error(y(137, e));
    if (t.dangerouslySetInnerHTML != null) {
      if (t.children != null) throw Error(y(60));
      if (typeof t.dangerouslySetInnerHTML != 'object' || !('__html' in t.dangerouslySetInnerHTML))
        throw Error(y(61));
    }
    if (t.style != null && typeof t.style != 'object') throw Error(y(62));
  }
}
function ao(e, t) {
  if (e.indexOf('-') === -1) return typeof t.is == 'string';
  switch (e) {
    case 'annotation-xml':
    case 'color-profile':
    case 'font-face':
    case 'font-face-src':
    case 'font-face-uri':
    case 'font-face-format':
    case 'font-face-name':
    case 'missing-glyph':
      return !1;
    default:
      return !0;
  }
}
var co = null;
function nu(e) {
  return (
    (e = e.target || e.srcElement || window),
    e.correspondingUseElement && (e = e.correspondingUseElement),
    e.nodeType === 3 ? e.parentNode : e
  );
}
var fo = null,
  Kt = null,
  Gt = null;
function qu(e) {
  if ((e = bn(e))) {
    if (typeof fo != 'function') throw Error(y(280));
    var t = e.stateNode;
    t && ((t = sl(t)), fo(e.stateNode, e.type, t));
  }
}
function Ts(e) {
  Kt ? (Gt ? Gt.push(e) : (Gt = [e])) : (Kt = e);
}
function Ls() {
  if (Kt) {
    var e = Kt,
      t = Gt;
    if (((Gt = Kt = null), qu(e), t)) for (e = 0; e < t.length; e++) qu(t[e]);
  }
}
function js(e, t) {
  return e(t);
}
function Rs() {}
var zl = !1;
function Os(e, t, n) {
  if (zl) return e(t, n);
  zl = !0;
  try {
    return js(e, t, n);
  } finally {
    ((zl = !1), (Kt !== null || Gt !== null) && (Rs(), Ls()));
  }
}
function Dn(e, t) {
  var n = e.stateNode;
  if (n === null) return null;
  var r = sl(n);
  if (r === null) return null;
  n = r[t];
  e: switch (t) {
    case 'onClick':
    case 'onClickCapture':
    case 'onDoubleClick':
    case 'onDoubleClickCapture':
    case 'onMouseDown':
    case 'onMouseDownCapture':
    case 'onMouseMove':
    case 'onMouseMoveCapture':
    case 'onMouseUp':
    case 'onMouseUpCapture':
    case 'onMouseEnter':
      ((r = !r.disabled) ||
        ((e = e.type),
        (r = !(e === 'button' || e === 'input' || e === 'select' || e === 'textarea'))),
        (e = !r));
      break e;
    default:
      e = !1;
  }
  if (e) return null;
  if (n && typeof n != 'function') throw Error(y(231, t, typeof n));
  return n;
}
var po = !1;
if (Qe)
  try {
    var dn = {};
    (Object.defineProperty(dn, 'passive', {
      get: function () {
        po = !0;
      },
    }),
      window.addEventListener('test', dn, dn),
      window.removeEventListener('test', dn, dn));
  } catch {
    po = !1;
  }
function nf(e, t, n, r, l, o, u, i, s) {
  var c = Array.prototype.slice.call(arguments, 3);
  try {
    t.apply(n, c);
  } catch (m) {
    this.onError(m);
  }
}
var Cn = !1,
  Dr = null,
  Mr = !1,
  mo = null,
  rf = {
    onError: function (e) {
      ((Cn = !0), (Dr = e));
    },
  };
function lf(e, t, n, r, l, o, u, i, s) {
  ((Cn = !1), (Dr = null), nf.apply(rf, arguments));
}
function of(e, t, n, r, l, o, u, i, s) {
  if ((lf.apply(this, arguments), Cn)) {
    if (Cn) {
      var c = Dr;
      ((Cn = !1), (Dr = null));
    } else throw Error(y(198));
    Mr || ((Mr = !0), (mo = c));
  }
}
function jt(e) {
  var t = e,
    n = e;
  if (e.alternate) for (; t.return; ) t = t.return;
  else {
    e = t;
    do ((t = e), t.flags & 4098 && (n = t.return), (e = t.return));
    while (e);
  }
  return t.tag === 3 ? n : null;
}
function Ds(e) {
  if (e.tag === 13) {
    var t = e.memoizedState;
    if ((t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)), t !== null))
      return t.dehydrated;
  }
  return null;
}
function bu(e) {
  if (jt(e) !== e) throw Error(y(188));
}
function uf(e) {
  var t = e.alternate;
  if (!t) {
    if (((t = jt(e)), t === null)) throw Error(y(188));
    return t !== e ? null : e;
  }
  for (var n = e, r = t; ; ) {
    var l = n.return;
    if (l === null) break;
    var o = l.alternate;
    if (o === null) {
      if (((r = l.return), r !== null)) {
        n = r;
        continue;
      }
      break;
    }
    if (l.child === o.child) {
      for (o = l.child; o; ) {
        if (o === n) return (bu(l), e);
        if (o === r) return (bu(l), t);
        o = o.sibling;
      }
      throw Error(y(188));
    }
    if (n.return !== r.return) ((n = l), (r = o));
    else {
      for (var u = !1, i = l.child; i; ) {
        if (i === n) {
          ((u = !0), (n = l), (r = o));
          break;
        }
        if (i === r) {
          ((u = !0), (r = l), (n = o));
          break;
        }
        i = i.sibling;
      }
      if (!u) {
        for (i = o.child; i; ) {
          if (i === n) {
            ((u = !0), (n = o), (r = l));
            break;
          }
          if (i === r) {
            ((u = !0), (r = o), (n = l));
            break;
          }
          i = i.sibling;
        }
        if (!u) throw Error(y(189));
      }
    }
    if (n.alternate !== r) throw Error(y(190));
  }
  if (n.tag !== 3) throw Error(y(188));
  return n.stateNode.current === n ? e : t;
}
function Ms(e) {
  return ((e = uf(e)), e !== null ? Is(e) : null);
}
function Is(e) {
  if (e.tag === 5 || e.tag === 6) return e;
  for (e = e.child; e !== null; ) {
    var t = Is(e);
    if (t !== null) return t;
    e = e.sibling;
  }
  return null;
}
var Fs = ge.unstable_scheduleCallback,
  ei = ge.unstable_cancelCallback,
  sf = ge.unstable_shouldYield,
  af = ge.unstable_requestPaint,
  Q = ge.unstable_now,
  cf = ge.unstable_getCurrentPriorityLevel,
  ru = ge.unstable_ImmediatePriority,
  As = ge.unstable_UserBlockingPriority,
  Ir = ge.unstable_NormalPriority,
  ff = ge.unstable_LowPriority,
  Us = ge.unstable_IdlePriority,
  ll = null,
  Ae = null;
function df(e) {
  if (Ae && typeof Ae.onCommitFiberRoot == 'function')
    try {
      Ae.onCommitFiberRoot(ll, e, void 0, (e.current.flags & 128) === 128);
    } catch {}
}
var Re = Math.clz32 ? Math.clz32 : hf,
  pf = Math.log,
  mf = Math.LN2;
function hf(e) {
  return ((e >>>= 0), e === 0 ? 32 : (31 - ((pf(e) / mf) | 0)) | 0);
}
var sr = 64,
  ar = 4194304;
function kn(e) {
  switch (e & -e) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 4:
      return 4;
    case 8:
      return 8;
    case 16:
      return 16;
    case 32:
      return 32;
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return e & 4194240;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return e & 130023424;
    case 134217728:
      return 134217728;
    case 268435456:
      return 268435456;
    case 536870912:
      return 536870912;
    case 1073741824:
      return 1073741824;
    default:
      return e;
  }
}
function Fr(e, t) {
  var n = e.pendingLanes;
  if (n === 0) return 0;
  var r = 0,
    l = e.suspendedLanes,
    o = e.pingedLanes,
    u = n & 268435455;
  if (u !== 0) {
    var i = u & ~l;
    i !== 0 ? (r = kn(i)) : ((o &= u), o !== 0 && (r = kn(o)));
  } else ((u = n & ~l), u !== 0 ? (r = kn(u)) : o !== 0 && (r = kn(o)));
  if (r === 0) return 0;
  if (
    t !== 0 &&
    t !== r &&
    !(t & l) &&
    ((l = r & -r), (o = t & -t), l >= o || (l === 16 && (o & 4194240) !== 0))
  )
    return t;
  if ((r & 4 && (r |= n & 16), (t = e.entangledLanes), t !== 0))
    for (e = e.entanglements, t &= r; 0 < t; )
      ((n = 31 - Re(t)), (l = 1 << n), (r |= e[n]), (t &= ~l));
  return r;
}
function vf(e, t) {
  switch (e) {
    case 1:
    case 2:
    case 4:
      return t + 250;
    case 8:
    case 16:
    case 32:
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return t + 5e3;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return -1;
    case 134217728:
    case 268435456:
    case 536870912:
    case 1073741824:
      return -1;
    default:
      return -1;
  }
}
function yf(e, t) {
  for (
    var n = e.suspendedLanes, r = e.pingedLanes, l = e.expirationTimes, o = e.pendingLanes;
    0 < o;
  ) {
    var u = 31 - Re(o),
      i = 1 << u,
      s = l[u];
    (s === -1 ? (!(i & n) || i & r) && (l[u] = vf(i, t)) : s <= t && (e.expiredLanes |= i),
      (o &= ~i));
  }
}
function ho(e) {
  return ((e = e.pendingLanes & -1073741825), e !== 0 ? e : e & 1073741824 ? 1073741824 : 0);
}
function Vs() {
  var e = sr;
  return ((sr <<= 1), !(sr & 4194240) && (sr = 64), e);
}
function Tl(e) {
  for (var t = [], n = 0; 31 > n; n++) t.push(e);
  return t;
}
function Jn(e, t, n) {
  ((e.pendingLanes |= t),
    t !== 536870912 && ((e.suspendedLanes = 0), (e.pingedLanes = 0)),
    (e = e.eventTimes),
    (t = 31 - Re(t)),
    (e[t] = n));
}
function gf(e, t) {
  var n = e.pendingLanes & ~t;
  ((e.pendingLanes = t),
    (e.suspendedLanes = 0),
    (e.pingedLanes = 0),
    (e.expiredLanes &= t),
    (e.mutableReadLanes &= t),
    (e.entangledLanes &= t),
    (t = e.entanglements));
  var r = e.eventTimes;
  for (e = e.expirationTimes; 0 < n; ) {
    var l = 31 - Re(n),
      o = 1 << l;
    ((t[l] = 0), (r[l] = -1), (e[l] = -1), (n &= ~o));
  }
}
function lu(e, t) {
  var n = (e.entangledLanes |= t);
  for (e = e.entanglements; n; ) {
    var r = 31 - Re(n),
      l = 1 << r;
    ((l & t) | (e[r] & t) && (e[r] |= t), (n &= ~l));
  }
}
var O = 0;
function $s(e) {
  return ((e &= -e), 1 < e ? (4 < e ? (e & 268435455 ? 16 : 536870912) : 4) : 1);
}
var Bs,
  ou,
  Ws,
  Hs,
  Qs,
  vo = !1,
  cr = [],
  rt = null,
  lt = null,
  ot = null,
  Mn = new Map(),
  In = new Map(),
  be = [],
  wf =
    'mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit'.split(
      ' '
    );
function ti(e, t) {
  switch (e) {
    case 'focusin':
    case 'focusout':
      rt = null;
      break;
    case 'dragenter':
    case 'dragleave':
      lt = null;
      break;
    case 'mouseover':
    case 'mouseout':
      ot = null;
      break;
    case 'pointerover':
    case 'pointerout':
      Mn.delete(t.pointerId);
      break;
    case 'gotpointercapture':
    case 'lostpointercapture':
      In.delete(t.pointerId);
  }
}
function pn(e, t, n, r, l, o) {
  return e === null || e.nativeEvent !== o
    ? ((e = {
        blockedOn: t,
        domEventName: n,
        eventSystemFlags: r,
        nativeEvent: o,
        targetContainers: [l],
      }),
      t !== null && ((t = bn(t)), t !== null && ou(t)),
      e)
    : ((e.eventSystemFlags |= r),
      (t = e.targetContainers),
      l !== null && t.indexOf(l) === -1 && t.push(l),
      e);
}
function Sf(e, t, n, r, l) {
  switch (t) {
    case 'focusin':
      return ((rt = pn(rt, e, t, n, r, l)), !0);
    case 'dragenter':
      return ((lt = pn(lt, e, t, n, r, l)), !0);
    case 'mouseover':
      return ((ot = pn(ot, e, t, n, r, l)), !0);
    case 'pointerover':
      var o = l.pointerId;
      return (Mn.set(o, pn(Mn.get(o) || null, e, t, n, r, l)), !0);
    case 'gotpointercapture':
      return ((o = l.pointerId), In.set(o, pn(In.get(o) || null, e, t, n, r, l)), !0);
  }
  return !1;
}
function Ks(e) {
  var t = St(e.target);
  if (t !== null) {
    var n = jt(t);
    if (n !== null) {
      if (((t = n.tag), t === 13)) {
        if (((t = Ds(n)), t !== null)) {
          ((e.blockedOn = t),
            Qs(e.priority, function () {
              Ws(n);
            }));
          return;
        }
      } else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
        e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
        return;
      }
    }
  }
  e.blockedOn = null;
}
function Er(e) {
  if (e.blockedOn !== null) return !1;
  for (var t = e.targetContainers; 0 < t.length; ) {
    var n = yo(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
    if (n === null) {
      n = e.nativeEvent;
      var r = new n.constructor(n.type, n);
      ((co = r), n.target.dispatchEvent(r), (co = null));
    } else return ((t = bn(n)), t !== null && ou(t), (e.blockedOn = n), !1);
    t.shift();
  }
  return !0;
}
function ni(e, t, n) {
  Er(e) && n.delete(t);
}
function kf() {
  ((vo = !1),
    rt !== null && Er(rt) && (rt = null),
    lt !== null && Er(lt) && (lt = null),
    ot !== null && Er(ot) && (ot = null),
    Mn.forEach(ni),
    In.forEach(ni));
}
function mn(e, t) {
  e.blockedOn === t &&
    ((e.blockedOn = null),
    vo || ((vo = !0), ge.unstable_scheduleCallback(ge.unstable_NormalPriority, kf)));
}
function Fn(e) {
  function t(l) {
    return mn(l, e);
  }
  if (0 < cr.length) {
    mn(cr[0], e);
    for (var n = 1; n < cr.length; n++) {
      var r = cr[n];
      r.blockedOn === e && (r.blockedOn = null);
    }
  }
  for (
    rt !== null && mn(rt, e),
      lt !== null && mn(lt, e),
      ot !== null && mn(ot, e),
      Mn.forEach(t),
      In.forEach(t),
      n = 0;
    n < be.length;
    n++
  )
    ((r = be[n]), r.blockedOn === e && (r.blockedOn = null));
  for (; 0 < be.length && ((n = be[0]), n.blockedOn === null); )
    (Ks(n), n.blockedOn === null && be.shift());
}
var Yt = Xe.ReactCurrentBatchConfig,
  Ar = !0;
function xf(e, t, n, r) {
  var l = O,
    o = Yt.transition;
  Yt.transition = null;
  try {
    ((O = 1), uu(e, t, n, r));
  } finally {
    ((O = l), (Yt.transition = o));
  }
}
function Ef(e, t, n, r) {
  var l = O,
    o = Yt.transition;
  Yt.transition = null;
  try {
    ((O = 4), uu(e, t, n, r));
  } finally {
    ((O = l), (Yt.transition = o));
  }
}
function uu(e, t, n, r) {
  if (Ar) {
    var l = yo(e, t, n, r);
    if (l === null) (Ul(e, t, r, Ur, n), ti(e, r));
    else if (Sf(l, e, t, n, r)) r.stopPropagation();
    else if ((ti(e, r), t & 4 && -1 < wf.indexOf(e))) {
      for (; l !== null; ) {
        var o = bn(l);
        if ((o !== null && Bs(o), (o = yo(e, t, n, r)), o === null && Ul(e, t, r, Ur, n), o === l))
          break;
        l = o;
      }
      l !== null && r.stopPropagation();
    } else Ul(e, t, r, null, n);
  }
}
var Ur = null;
function yo(e, t, n, r) {
  if (((Ur = null), (e = nu(r)), (e = St(e)), e !== null))
    if (((t = jt(e)), t === null)) e = null;
    else if (((n = t.tag), n === 13)) {
      if (((e = Ds(t)), e !== null)) return e;
      e = null;
    } else if (n === 3) {
      if (t.stateNode.current.memoizedState.isDehydrated)
        return t.tag === 3 ? t.stateNode.containerInfo : null;
      e = null;
    } else t !== e && (e = null);
  return ((Ur = e), null);
}
function Gs(e) {
  switch (e) {
    case 'cancel':
    case 'click':
    case 'close':
    case 'contextmenu':
    case 'copy':
    case 'cut':
    case 'auxclick':
    case 'dblclick':
    case 'dragend':
    case 'dragstart':
    case 'drop':
    case 'focusin':
    case 'focusout':
    case 'input':
    case 'invalid':
    case 'keydown':
    case 'keypress':
    case 'keyup':
    case 'mousedown':
    case 'mouseup':
    case 'paste':
    case 'pause':
    case 'play':
    case 'pointercancel':
    case 'pointerdown':
    case 'pointerup':
    case 'ratechange':
    case 'reset':
    case 'resize':
    case 'seeked':
    case 'submit':
    case 'touchcancel':
    case 'touchend':
    case 'touchstart':
    case 'volumechange':
    case 'change':
    case 'selectionchange':
    case 'textInput':
    case 'compositionstart':
    case 'compositionend':
    case 'compositionupdate':
    case 'beforeblur':
    case 'afterblur':
    case 'beforeinput':
    case 'blur':
    case 'fullscreenchange':
    case 'focus':
    case 'hashchange':
    case 'popstate':
    case 'select':
    case 'selectstart':
      return 1;
    case 'drag':
    case 'dragenter':
    case 'dragexit':
    case 'dragleave':
    case 'dragover':
    case 'mousemove':
    case 'mouseout':
    case 'mouseover':
    case 'pointermove':
    case 'pointerout':
    case 'pointerover':
    case 'scroll':
    case 'toggle':
    case 'touchmove':
    case 'wheel':
    case 'mouseenter':
    case 'mouseleave':
    case 'pointerenter':
    case 'pointerleave':
      return 4;
    case 'message':
      switch (cf()) {
        case ru:
          return 1;
        case As:
          return 4;
        case Ir:
        case ff:
          return 16;
        case Us:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var tt = null,
  iu = null,
  Cr = null;
function Ys() {
  if (Cr) return Cr;
  var e,
    t = iu,
    n = t.length,
    r,
    l = 'value' in tt ? tt.value : tt.textContent,
    o = l.length;
  for (e = 0; e < n && t[e] === l[e]; e++);
  var u = n - e;
  for (r = 1; r <= u && t[n - r] === l[o - r]; r++);
  return (Cr = l.slice(e, 1 < r ? 1 - r : void 0));
}
function _r(e) {
  var t = e.keyCode;
  return (
    'charCode' in e ? ((e = e.charCode), e === 0 && t === 13 && (e = 13)) : (e = t),
    e === 10 && (e = 13),
    32 <= e || e === 13 ? e : 0
  );
}
function fr() {
  return !0;
}
function ri() {
  return !1;
}
function Se(e) {
  function t(n, r, l, o, u) {
    ((this._reactName = n),
      (this._targetInst = l),
      (this.type = r),
      (this.nativeEvent = o),
      (this.target = u),
      (this.currentTarget = null));
    for (var i in e) e.hasOwnProperty(i) && ((n = e[i]), (this[i] = n ? n(o) : o[i]));
    return (
      (this.isDefaultPrevented = (
        o.defaultPrevented != null ? o.defaultPrevented : o.returnValue === !1
      )
        ? fr
        : ri),
      (this.isPropagationStopped = ri),
      this
    );
  }
  return (
    $(t.prototype, {
      preventDefault: function () {
        this.defaultPrevented = !0;
        var n = this.nativeEvent;
        n &&
          (n.preventDefault
            ? n.preventDefault()
            : typeof n.returnValue != 'unknown' && (n.returnValue = !1),
          (this.isDefaultPrevented = fr));
      },
      stopPropagation: function () {
        var n = this.nativeEvent;
        n &&
          (n.stopPropagation
            ? n.stopPropagation()
            : typeof n.cancelBubble != 'unknown' && (n.cancelBubble = !0),
          (this.isPropagationStopped = fr));
      },
      persist: function () {},
      isPersistent: fr,
    }),
    t
  );
}
var un = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function (e) {
      return e.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0,
  },
  su = Se(un),
  qn = $({}, un, { view: 0, detail: 0 }),
  Cf = Se(qn),
  Ll,
  jl,
  hn,
  ol = $({}, qn, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: au,
    button: 0,
    buttons: 0,
    relatedTarget: function (e) {
      return e.relatedTarget === void 0
        ? e.fromElement === e.srcElement
          ? e.toElement
          : e.fromElement
        : e.relatedTarget;
    },
    movementX: function (e) {
      return 'movementX' in e
        ? e.movementX
        : (e !== hn &&
            (hn && e.type === 'mousemove'
              ? ((Ll = e.screenX - hn.screenX), (jl = e.screenY - hn.screenY))
              : (jl = Ll = 0),
            (hn = e)),
          Ll);
    },
    movementY: function (e) {
      return 'movementY' in e ? e.movementY : jl;
    },
  }),
  li = Se(ol),
  _f = $({}, ol, { dataTransfer: 0 }),
  Nf = Se(_f),
  Pf = $({}, qn, { relatedTarget: 0 }),
  Rl = Se(Pf),
  zf = $({}, un, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }),
  Tf = Se(zf),
  Lf = $({}, un, {
    clipboardData: function (e) {
      return 'clipboardData' in e ? e.clipboardData : window.clipboardData;
    },
  }),
  jf = Se(Lf),
  Rf = $({}, un, { data: 0 }),
  oi = Se(Rf),
  Of = {
    Esc: 'Escape',
    Spacebar: ' ',
    Left: 'ArrowLeft',
    Up: 'ArrowUp',
    Right: 'ArrowRight',
    Down: 'ArrowDown',
    Del: 'Delete',
    Win: 'OS',
    Menu: 'ContextMenu',
    Apps: 'ContextMenu',
    Scroll: 'ScrollLock',
    MozPrintableKey: 'Unidentified',
  },
  Df = {
    8: 'Backspace',
    9: 'Tab',
    12: 'Clear',
    13: 'Enter',
    16: 'Shift',
    17: 'Control',
    18: 'Alt',
    19: 'Pause',
    20: 'CapsLock',
    27: 'Escape',
    32: ' ',
    33: 'PageUp',
    34: 'PageDown',
    35: 'End',
    36: 'Home',
    37: 'ArrowLeft',
    38: 'ArrowUp',
    39: 'ArrowRight',
    40: 'ArrowDown',
    45: 'Insert',
    46: 'Delete',
    112: 'F1',
    113: 'F2',
    114: 'F3',
    115: 'F4',
    116: 'F5',
    117: 'F6',
    118: 'F7',
    119: 'F8',
    120: 'F9',
    121: 'F10',
    122: 'F11',
    123: 'F12',
    144: 'NumLock',
    145: 'ScrollLock',
    224: 'Meta',
  },
  Mf = { Alt: 'altKey', Control: 'ctrlKey', Meta: 'metaKey', Shift: 'shiftKey' };
function If(e) {
  var t = this.nativeEvent;
  return t.getModifierState ? t.getModifierState(e) : (e = Mf[e]) ? !!t[e] : !1;
}
function au() {
  return If;
}
var Ff = $({}, qn, {
    key: function (e) {
      if (e.key) {
        var t = Of[e.key] || e.key;
        if (t !== 'Unidentified') return t;
      }
      return e.type === 'keypress'
        ? ((e = _r(e)), e === 13 ? 'Enter' : String.fromCharCode(e))
        : e.type === 'keydown' || e.type === 'keyup'
          ? Df[e.keyCode] || 'Unidentified'
          : '';
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: au,
    charCode: function (e) {
      return e.type === 'keypress' ? _r(e) : 0;
    },
    keyCode: function (e) {
      return e.type === 'keydown' || e.type === 'keyup' ? e.keyCode : 0;
    },
    which: function (e) {
      return e.type === 'keypress'
        ? _r(e)
        : e.type === 'keydown' || e.type === 'keyup'
          ? e.keyCode
          : 0;
    },
  }),
  Af = Se(Ff),
  Uf = $({}, ol, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0,
  }),
  ui = Se(Uf),
  Vf = $({}, qn, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: au,
  }),
  $f = Se(Vf),
  Bf = $({}, un, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }),
  Wf = Se(Bf),
  Hf = $({}, ol, {
    deltaX: function (e) {
      return 'deltaX' in e ? e.deltaX : 'wheelDeltaX' in e ? -e.wheelDeltaX : 0;
    },
    deltaY: function (e) {
      return 'deltaY' in e
        ? e.deltaY
        : 'wheelDeltaY' in e
          ? -e.wheelDeltaY
          : 'wheelDelta' in e
            ? -e.wheelDelta
            : 0;
    },
    deltaZ: 0,
    deltaMode: 0,
  }),
  Qf = Se(Hf),
  Kf = [9, 13, 27, 32],
  cu = Qe && 'CompositionEvent' in window,
  _n = null;
Qe && 'documentMode' in document && (_n = document.documentMode);
var Gf = Qe && 'TextEvent' in window && !_n,
  Xs = Qe && (!cu || (_n && 8 < _n && 11 >= _n)),
  ii = ' ',
  si = !1;
function Zs(e, t) {
  switch (e) {
    case 'keyup':
      return Kf.indexOf(t.keyCode) !== -1;
    case 'keydown':
      return t.keyCode !== 229;
    case 'keypress':
    case 'mousedown':
    case 'focusout':
      return !0;
    default:
      return !1;
  }
}
function Js(e) {
  return ((e = e.detail), typeof e == 'object' && 'data' in e ? e.data : null);
}
var Mt = !1;
function Yf(e, t) {
  switch (e) {
    case 'compositionend':
      return Js(t);
    case 'keypress':
      return t.which !== 32 ? null : ((si = !0), ii);
    case 'textInput':
      return ((e = t.data), e === ii && si ? null : e);
    default:
      return null;
  }
}
function Xf(e, t) {
  if (Mt)
    return e === 'compositionend' || (!cu && Zs(e, t))
      ? ((e = Ys()), (Cr = iu = tt = null), (Mt = !1), e)
      : null;
  switch (e) {
    case 'paste':
      return null;
    case 'keypress':
      if (!(t.ctrlKey || t.altKey || t.metaKey) || (t.ctrlKey && t.altKey)) {
        if (t.char && 1 < t.char.length) return t.char;
        if (t.which) return String.fromCharCode(t.which);
      }
      return null;
    case 'compositionend':
      return Xs && t.locale !== 'ko' ? null : t.data;
    default:
      return null;
  }
}
var Zf = {
  color: !0,
  date: !0,
  datetime: !0,
  'datetime-local': !0,
  email: !0,
  month: !0,
  number: !0,
  password: !0,
  range: !0,
  search: !0,
  tel: !0,
  text: !0,
  time: !0,
  url: !0,
  week: !0,
};
function ai(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return t === 'input' ? !!Zf[e.type] : t === 'textarea';
}
function qs(e, t, n, r) {
  (Ts(r),
    (t = Vr(t, 'onChange')),
    0 < t.length &&
      ((n = new su('onChange', 'change', null, n, r)), e.push({ event: n, listeners: t })));
}
var Nn = null,
  An = null;
function Jf(e) {
  aa(e, 0);
}
function ul(e) {
  var t = At(e);
  if (xs(t)) return e;
}
function qf(e, t) {
  if (e === 'change') return t;
}
var bs = !1;
if (Qe) {
  var Ol;
  if (Qe) {
    var Dl = 'oninput' in document;
    if (!Dl) {
      var ci = document.createElement('div');
      (ci.setAttribute('oninput', 'return;'), (Dl = typeof ci.oninput == 'function'));
    }
    Ol = Dl;
  } else Ol = !1;
  bs = Ol && (!document.documentMode || 9 < document.documentMode);
}
function fi() {
  Nn && (Nn.detachEvent('onpropertychange', ea), (An = Nn = null));
}
function ea(e) {
  if (e.propertyName === 'value' && ul(An)) {
    var t = [];
    (qs(t, An, e, nu(e)), Os(Jf, t));
  }
}
function bf(e, t, n) {
  e === 'focusin'
    ? (fi(), (Nn = t), (An = n), Nn.attachEvent('onpropertychange', ea))
    : e === 'focusout' && fi();
}
function ed(e) {
  if (e === 'selectionchange' || e === 'keyup' || e === 'keydown') return ul(An);
}
function td(e, t) {
  if (e === 'click') return ul(t);
}
function nd(e, t) {
  if (e === 'input' || e === 'change') return ul(t);
}
function rd(e, t) {
  return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
}
var De = typeof Object.is == 'function' ? Object.is : rd;
function Un(e, t) {
  if (De(e, t)) return !0;
  if (typeof e != 'object' || e === null || typeof t != 'object' || t === null) return !1;
  var n = Object.keys(e),
    r = Object.keys(t);
  if (n.length !== r.length) return !1;
  for (r = 0; r < n.length; r++) {
    var l = n[r];
    if (!ql.call(t, l) || !De(e[l], t[l])) return !1;
  }
  return !0;
}
function di(e) {
  for (; e && e.firstChild; ) e = e.firstChild;
  return e;
}
function pi(e, t) {
  var n = di(e);
  e = 0;
  for (var r; n; ) {
    if (n.nodeType === 3) {
      if (((r = e + n.textContent.length), e <= t && r >= t)) return { node: n, offset: t - e };
      e = r;
    }
    e: {
      for (; n; ) {
        if (n.nextSibling) {
          n = n.nextSibling;
          break e;
        }
        n = n.parentNode;
      }
      n = void 0;
    }
    n = di(n);
  }
}
function ta(e, t) {
  return e && t
    ? e === t
      ? !0
      : e && e.nodeType === 3
        ? !1
        : t && t.nodeType === 3
          ? ta(e, t.parentNode)
          : 'contains' in e
            ? e.contains(t)
            : e.compareDocumentPosition
              ? !!(e.compareDocumentPosition(t) & 16)
              : !1
    : !1;
}
function na() {
  for (var e = window, t = Or(); t instanceof e.HTMLIFrameElement; ) {
    try {
      var n = typeof t.contentWindow.location.href == 'string';
    } catch {
      n = !1;
    }
    if (n) e = t.contentWindow;
    else break;
    t = Or(e.document);
  }
  return t;
}
function fu(e) {
  var t = e && e.nodeName && e.nodeName.toLowerCase();
  return (
    t &&
    ((t === 'input' &&
      (e.type === 'text' ||
        e.type === 'search' ||
        e.type === 'tel' ||
        e.type === 'url' ||
        e.type === 'password')) ||
      t === 'textarea' ||
      e.contentEditable === 'true')
  );
}
function ld(e) {
  var t = na(),
    n = e.focusedElem,
    r = e.selectionRange;
  if (t !== n && n && n.ownerDocument && ta(n.ownerDocument.documentElement, n)) {
    if (r !== null && fu(n)) {
      if (((t = r.start), (e = r.end), e === void 0 && (e = t), 'selectionStart' in n))
        ((n.selectionStart = t), (n.selectionEnd = Math.min(e, n.value.length)));
      else if (
        ((e = ((t = n.ownerDocument || document) && t.defaultView) || window), e.getSelection)
      ) {
        e = e.getSelection();
        var l = n.textContent.length,
          o = Math.min(r.start, l);
        ((r = r.end === void 0 ? o : Math.min(r.end, l)),
          !e.extend && o > r && ((l = r), (r = o), (o = l)),
          (l = pi(n, o)));
        var u = pi(n, r);
        l &&
          u &&
          (e.rangeCount !== 1 ||
            e.anchorNode !== l.node ||
            e.anchorOffset !== l.offset ||
            e.focusNode !== u.node ||
            e.focusOffset !== u.offset) &&
          ((t = t.createRange()),
          t.setStart(l.node, l.offset),
          e.removeAllRanges(),
          o > r
            ? (e.addRange(t), e.extend(u.node, u.offset))
            : (t.setEnd(u.node, u.offset), e.addRange(t)));
      }
    }
    for (t = [], e = n; (e = e.parentNode); )
      e.nodeType === 1 && t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
    for (typeof n.focus == 'function' && n.focus(), n = 0; n < t.length; n++)
      ((e = t[n]), (e.element.scrollLeft = e.left), (e.element.scrollTop = e.top));
  }
}
var od = Qe && 'documentMode' in document && 11 >= document.documentMode,
  It = null,
  go = null,
  Pn = null,
  wo = !1;
function mi(e, t, n) {
  var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
  wo ||
    It == null ||
    It !== Or(r) ||
    ((r = It),
    'selectionStart' in r && fu(r)
      ? (r = { start: r.selectionStart, end: r.selectionEnd })
      : ((r = ((r.ownerDocument && r.ownerDocument.defaultView) || window).getSelection()),
        (r = {
          anchorNode: r.anchorNode,
          anchorOffset: r.anchorOffset,
          focusNode: r.focusNode,
          focusOffset: r.focusOffset,
        })),
    (Pn && Un(Pn, r)) ||
      ((Pn = r),
      (r = Vr(go, 'onSelect')),
      0 < r.length &&
        ((t = new su('onSelect', 'select', null, t, n)),
        e.push({ event: t, listeners: r }),
        (t.target = It))));
}
function dr(e, t) {
  var n = {};
  return (
    (n[e.toLowerCase()] = t.toLowerCase()),
    (n['Webkit' + e] = 'webkit' + t),
    (n['Moz' + e] = 'moz' + t),
    n
  );
}
var Ft = {
    animationend: dr('Animation', 'AnimationEnd'),
    animationiteration: dr('Animation', 'AnimationIteration'),
    animationstart: dr('Animation', 'AnimationStart'),
    transitionend: dr('Transition', 'TransitionEnd'),
  },
  Ml = {},
  ra = {};
Qe &&
  ((ra = document.createElement('div').style),
  'AnimationEvent' in window ||
    (delete Ft.animationend.animation,
    delete Ft.animationiteration.animation,
    delete Ft.animationstart.animation),
  'TransitionEvent' in window || delete Ft.transitionend.transition);
function il(e) {
  if (Ml[e]) return Ml[e];
  if (!Ft[e]) return e;
  var t = Ft[e],
    n;
  for (n in t) if (t.hasOwnProperty(n) && n in ra) return (Ml[e] = t[n]);
  return e;
}
var la = il('animationend'),
  oa = il('animationiteration'),
  ua = il('animationstart'),
  ia = il('transitionend'),
  sa = new Map(),
  hi =
    'abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel'.split(
      ' '
    );
function pt(e, t) {
  (sa.set(e, t), Lt(t, [e]));
}
for (var Il = 0; Il < hi.length; Il++) {
  var Fl = hi[Il],
    ud = Fl.toLowerCase(),
    id = Fl[0].toUpperCase() + Fl.slice(1);
  pt(ud, 'on' + id);
}
pt(la, 'onAnimationEnd');
pt(oa, 'onAnimationIteration');
pt(ua, 'onAnimationStart');
pt('dblclick', 'onDoubleClick');
pt('focusin', 'onFocus');
pt('focusout', 'onBlur');
pt(ia, 'onTransitionEnd');
Jt('onMouseEnter', ['mouseout', 'mouseover']);
Jt('onMouseLeave', ['mouseout', 'mouseover']);
Jt('onPointerEnter', ['pointerout', 'pointerover']);
Jt('onPointerLeave', ['pointerout', 'pointerover']);
Lt('onChange', 'change click focusin focusout input keydown keyup selectionchange'.split(' '));
Lt(
  'onSelect',
  'focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange'.split(' ')
);
Lt('onBeforeInput', ['compositionend', 'keypress', 'textInput', 'paste']);
Lt('onCompositionEnd', 'compositionend focusout keydown keypress keyup mousedown'.split(' '));
Lt('onCompositionStart', 'compositionstart focusout keydown keypress keyup mousedown'.split(' '));
Lt('onCompositionUpdate', 'compositionupdate focusout keydown keypress keyup mousedown'.split(' '));
var xn =
    'abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting'.split(
      ' '
    ),
  sd = new Set('cancel close invalid load scroll toggle'.split(' ').concat(xn));
function vi(e, t, n) {
  var r = e.type || 'unknown-event';
  ((e.currentTarget = n), of(r, t, void 0, e), (e.currentTarget = null));
}
function aa(e, t) {
  t = (t & 4) !== 0;
  for (var n = 0; n < e.length; n++) {
    var r = e[n],
      l = r.event;
    r = r.listeners;
    e: {
      var o = void 0;
      if (t)
        for (var u = r.length - 1; 0 <= u; u--) {
          var i = r[u],
            s = i.instance,
            c = i.currentTarget;
          if (((i = i.listener), s !== o && l.isPropagationStopped())) break e;
          (vi(l, i, c), (o = s));
        }
      else
        for (u = 0; u < r.length; u++) {
          if (
            ((i = r[u]),
            (s = i.instance),
            (c = i.currentTarget),
            (i = i.listener),
            s !== o && l.isPropagationStopped())
          )
            break e;
          (vi(l, i, c), (o = s));
        }
    }
  }
  if (Mr) throw ((e = mo), (Mr = !1), (mo = null), e);
}
function M(e, t) {
  var n = t[Co];
  n === void 0 && (n = t[Co] = new Set());
  var r = e + '__bubble';
  n.has(r) || (ca(t, e, 2, !1), n.add(r));
}
function Al(e, t, n) {
  var r = 0;
  (t && (r |= 4), ca(n, e, r, t));
}
var pr = '_reactListening' + Math.random().toString(36).slice(2);
function Vn(e) {
  if (!e[pr]) {
    ((e[pr] = !0),
      ys.forEach(function (n) {
        n !== 'selectionchange' && (sd.has(n) || Al(n, !1, e), Al(n, !0, e));
      }));
    var t = e.nodeType === 9 ? e : e.ownerDocument;
    t === null || t[pr] || ((t[pr] = !0), Al('selectionchange', !1, t));
  }
}
function ca(e, t, n, r) {
  switch (Gs(t)) {
    case 1:
      var l = xf;
      break;
    case 4:
      l = Ef;
      break;
    default:
      l = uu;
  }
  ((n = l.bind(null, t, n, e)),
    (l = void 0),
    !po || (t !== 'touchstart' && t !== 'touchmove' && t !== 'wheel') || (l = !0),
    r
      ? l !== void 0
        ? e.addEventListener(t, n, { capture: !0, passive: l })
        : e.addEventListener(t, n, !0)
      : l !== void 0
        ? e.addEventListener(t, n, { passive: l })
        : e.addEventListener(t, n, !1));
}
function Ul(e, t, n, r, l) {
  var o = r;
  if (!(t & 1) && !(t & 2) && r !== null)
    e: for (;;) {
      if (r === null) return;
      var u = r.tag;
      if (u === 3 || u === 4) {
        var i = r.stateNode.containerInfo;
        if (i === l || (i.nodeType === 8 && i.parentNode === l)) break;
        if (u === 4)
          for (u = r.return; u !== null; ) {
            var s = u.tag;
            if (
              (s === 3 || s === 4) &&
              ((s = u.stateNode.containerInfo), s === l || (s.nodeType === 8 && s.parentNode === l))
            )
              return;
            u = u.return;
          }
        for (; i !== null; ) {
          if (((u = St(i)), u === null)) return;
          if (((s = u.tag), s === 5 || s === 6)) {
            r = o = u;
            continue e;
          }
          i = i.parentNode;
        }
      }
      r = r.return;
    }
  Os(function () {
    var c = o,
      m = nu(n),
      h = [];
    e: {
      var p = sa.get(e);
      if (p !== void 0) {
        var g = su,
          w = e;
        switch (e) {
          case 'keypress':
            if (_r(n) === 0) break e;
          case 'keydown':
          case 'keyup':
            g = Af;
            break;
          case 'focusin':
            ((w = 'focus'), (g = Rl));
            break;
          case 'focusout':
            ((w = 'blur'), (g = Rl));
            break;
          case 'beforeblur':
          case 'afterblur':
            g = Rl;
            break;
          case 'click':
            if (n.button === 2) break e;
          case 'auxclick':
          case 'dblclick':
          case 'mousedown':
          case 'mousemove':
          case 'mouseup':
          case 'mouseout':
          case 'mouseover':
          case 'contextmenu':
            g = li;
            break;
          case 'drag':
          case 'dragend':
          case 'dragenter':
          case 'dragexit':
          case 'dragleave':
          case 'dragover':
          case 'dragstart':
          case 'drop':
            g = Nf;
            break;
          case 'touchcancel':
          case 'touchend':
          case 'touchmove':
          case 'touchstart':
            g = $f;
            break;
          case la:
          case oa:
          case ua:
            g = Tf;
            break;
          case ia:
            g = Wf;
            break;
          case 'scroll':
            g = Cf;
            break;
          case 'wheel':
            g = Qf;
            break;
          case 'copy':
          case 'cut':
          case 'paste':
            g = jf;
            break;
          case 'gotpointercapture':
          case 'lostpointercapture':
          case 'pointercancel':
          case 'pointerdown':
          case 'pointermove':
          case 'pointerout':
          case 'pointerover':
          case 'pointerup':
            g = ui;
        }
        var S = (t & 4) !== 0,
          F = !S && e === 'scroll',
          f = S ? (p !== null ? p + 'Capture' : null) : p;
        S = [];
        for (var a = c, d; a !== null; ) {
          d = a;
          var v = d.stateNode;
          if (
            (d.tag === 5 &&
              v !== null &&
              ((d = v), f !== null && ((v = Dn(a, f)), v != null && S.push($n(a, v, d)))),
            F)
          )
            break;
          a = a.return;
        }
        0 < S.length && ((p = new g(p, w, null, n, m)), h.push({ event: p, listeners: S }));
      }
    }
    if (!(t & 7)) {
      e: {
        if (
          ((p = e === 'mouseover' || e === 'pointerover'),
          (g = e === 'mouseout' || e === 'pointerout'),
          p && n !== co && (w = n.relatedTarget || n.fromElement) && (St(w) || w[Ke]))
        )
          break e;
        if (
          (g || p) &&
          ((p =
            m.window === m ? m : (p = m.ownerDocument) ? p.defaultView || p.parentWindow : window),
          g
            ? ((w = n.relatedTarget || n.toElement),
              (g = c),
              (w = w ? St(w) : null),
              w !== null && ((F = jt(w)), w !== F || (w.tag !== 5 && w.tag !== 6)) && (w = null))
            : ((g = null), (w = c)),
          g !== w)
        ) {
          if (
            ((S = li),
            (v = 'onMouseLeave'),
            (f = 'onMouseEnter'),
            (a = 'mouse'),
            (e === 'pointerout' || e === 'pointerover') &&
              ((S = ui), (v = 'onPointerLeave'), (f = 'onPointerEnter'), (a = 'pointer')),
            (F = g == null ? p : At(g)),
            (d = w == null ? p : At(w)),
            (p = new S(v, a + 'leave', g, n, m)),
            (p.target = F),
            (p.relatedTarget = d),
            (v = null),
            St(m) === c &&
              ((S = new S(f, a + 'enter', w, n, m)),
              (S.target = d),
              (S.relatedTarget = F),
              (v = S)),
            (F = v),
            g && w)
          )
            t: {
              for (S = g, f = w, a = 0, d = S; d; d = Rt(d)) a++;
              for (d = 0, v = f; v; v = Rt(v)) d++;
              for (; 0 < a - d; ) ((S = Rt(S)), a--);
              for (; 0 < d - a; ) ((f = Rt(f)), d--);
              for (; a--; ) {
                if (S === f || (f !== null && S === f.alternate)) break t;
                ((S = Rt(S)), (f = Rt(f)));
              }
              S = null;
            }
          else S = null;
          (g !== null && yi(h, p, g, S, !1), w !== null && F !== null && yi(h, F, w, S, !0));
        }
      }
      e: {
        if (
          ((p = c ? At(c) : window),
          (g = p.nodeName && p.nodeName.toLowerCase()),
          g === 'select' || (g === 'input' && p.type === 'file'))
        )
          var x = qf;
        else if (ai(p))
          if (bs) x = nd;
          else {
            x = ed;
            var C = bf;
          }
        else
          (g = p.nodeName) &&
            g.toLowerCase() === 'input' &&
            (p.type === 'checkbox' || p.type === 'radio') &&
            (x = td);
        if (x && (x = x(e, c))) {
          qs(h, x, n, m);
          break e;
        }
        (C && C(e, p, c),
          e === 'focusout' &&
            (C = p._wrapperState) &&
            C.controlled &&
            p.type === 'number' &&
            oo(p, 'number', p.value));
      }
      switch (((C = c ? At(c) : window), e)) {
        case 'focusin':
          (ai(C) || C.contentEditable === 'true') && ((It = C), (go = c), (Pn = null));
          break;
        case 'focusout':
          Pn = go = It = null;
          break;
        case 'mousedown':
          wo = !0;
          break;
        case 'contextmenu':
        case 'mouseup':
        case 'dragend':
          ((wo = !1), mi(h, n, m));
          break;
        case 'selectionchange':
          if (od) break;
        case 'keydown':
        case 'keyup':
          mi(h, n, m);
      }
      var _;
      if (cu)
        e: {
          switch (e) {
            case 'compositionstart':
              var N = 'onCompositionStart';
              break e;
            case 'compositionend':
              N = 'onCompositionEnd';
              break e;
            case 'compositionupdate':
              N = 'onCompositionUpdate';
              break e;
          }
          N = void 0;
        }
      else
        Mt
          ? Zs(e, n) && (N = 'onCompositionEnd')
          : e === 'keydown' && n.keyCode === 229 && (N = 'onCompositionStart');
      (N &&
        (Xs &&
          n.locale !== 'ko' &&
          (Mt || N !== 'onCompositionStart'
            ? N === 'onCompositionEnd' && Mt && (_ = Ys())
            : ((tt = m), (iu = 'value' in tt ? tt.value : tt.textContent), (Mt = !0))),
        (C = Vr(c, N)),
        0 < C.length &&
          ((N = new oi(N, e, null, n, m)),
          h.push({ event: N, listeners: C }),
          _ ? (N.data = _) : ((_ = Js(n)), _ !== null && (N.data = _)))),
        (_ = Gf ? Yf(e, n) : Xf(e, n)) &&
          ((c = Vr(c, 'onBeforeInput')),
          0 < c.length &&
            ((m = new oi('onBeforeInput', 'beforeinput', null, n, m)),
            h.push({ event: m, listeners: c }),
            (m.data = _))));
    }
    aa(h, t);
  });
}
function $n(e, t, n) {
  return { instance: e, listener: t, currentTarget: n };
}
function Vr(e, t) {
  for (var n = t + 'Capture', r = []; e !== null; ) {
    var l = e,
      o = l.stateNode;
    (l.tag === 5 &&
      o !== null &&
      ((l = o),
      (o = Dn(e, n)),
      o != null && r.unshift($n(e, o, l)),
      (o = Dn(e, t)),
      o != null && r.push($n(e, o, l))),
      (e = e.return));
  }
  return r;
}
function Rt(e) {
  if (e === null) return null;
  do e = e.return;
  while (e && e.tag !== 5);
  return e || null;
}
function yi(e, t, n, r, l) {
  for (var o = t._reactName, u = []; n !== null && n !== r; ) {
    var i = n,
      s = i.alternate,
      c = i.stateNode;
    if (s !== null && s === r) break;
    (i.tag === 5 &&
      c !== null &&
      ((i = c),
      l
        ? ((s = Dn(n, o)), s != null && u.unshift($n(n, s, i)))
        : l || ((s = Dn(n, o)), s != null && u.push($n(n, s, i)))),
      (n = n.return));
  }
  u.length !== 0 && e.push({ event: t, listeners: u });
}
var ad = /\r\n?/g,
  cd = /\u0000|\uFFFD/g;
function gi(e) {
  return (typeof e == 'string' ? e : '' + e)
    .replace(
      ad,
      `
`
    )
    .replace(cd, '');
}
function mr(e, t, n) {
  if (((t = gi(t)), gi(e) !== t && n)) throw Error(y(425));
}
function $r() {}
var So = null,
  ko = null;
function xo(e, t) {
  return (
    e === 'textarea' ||
    e === 'noscript' ||
    typeof t.children == 'string' ||
    typeof t.children == 'number' ||
    (typeof t.dangerouslySetInnerHTML == 'object' &&
      t.dangerouslySetInnerHTML !== null &&
      t.dangerouslySetInnerHTML.__html != null)
  );
}
var Eo = typeof setTimeout == 'function' ? setTimeout : void 0,
  fd = typeof clearTimeout == 'function' ? clearTimeout : void 0,
  wi = typeof Promise == 'function' ? Promise : void 0,
  dd =
    typeof queueMicrotask == 'function'
      ? queueMicrotask
      : typeof wi < 'u'
        ? function (e) {
            return wi.resolve(null).then(e).catch(pd);
          }
        : Eo;
function pd(e) {
  setTimeout(function () {
    throw e;
  });
}
function Vl(e, t) {
  var n = t,
    r = 0;
  do {
    var l = n.nextSibling;
    if ((e.removeChild(n), l && l.nodeType === 8))
      if (((n = l.data), n === '/$')) {
        if (r === 0) {
          (e.removeChild(l), Fn(t));
          return;
        }
        r--;
      } else (n !== '$' && n !== '$?' && n !== '$!') || r++;
    n = l;
  } while (n);
  Fn(t);
}
function ut(e) {
  for (; e != null; e = e.nextSibling) {
    var t = e.nodeType;
    if (t === 1 || t === 3) break;
    if (t === 8) {
      if (((t = e.data), t === '$' || t === '$!' || t === '$?')) break;
      if (t === '/$') return null;
    }
  }
  return e;
}
function Si(e) {
  e = e.previousSibling;
  for (var t = 0; e; ) {
    if (e.nodeType === 8) {
      var n = e.data;
      if (n === '$' || n === '$!' || n === '$?') {
        if (t === 0) return e;
        t--;
      } else n === '/$' && t++;
    }
    e = e.previousSibling;
  }
  return null;
}
var sn = Math.random().toString(36).slice(2),
  Fe = '__reactFiber$' + sn,
  Bn = '__reactProps$' + sn,
  Ke = '__reactContainer$' + sn,
  Co = '__reactEvents$' + sn,
  md = '__reactListeners$' + sn,
  hd = '__reactHandles$' + sn;
function St(e) {
  var t = e[Fe];
  if (t) return t;
  for (var n = e.parentNode; n; ) {
    if ((t = n[Ke] || n[Fe])) {
      if (((n = t.alternate), t.child !== null || (n !== null && n.child !== null)))
        for (e = Si(e); e !== null; ) {
          if ((n = e[Fe])) return n;
          e = Si(e);
        }
      return t;
    }
    ((e = n), (n = e.parentNode));
  }
  return null;
}
function bn(e) {
  return (
    (e = e[Fe] || e[Ke]),
    !e || (e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3) ? null : e
  );
}
function At(e) {
  if (e.tag === 5 || e.tag === 6) return e.stateNode;
  throw Error(y(33));
}
function sl(e) {
  return e[Bn] || null;
}
var _o = [],
  Ut = -1;
function mt(e) {
  return { current: e };
}
function I(e) {
  0 > Ut || ((e.current = _o[Ut]), (_o[Ut] = null), Ut--);
}
function D(e, t) {
  (Ut++, (_o[Ut] = e.current), (e.current = t));
}
var dt = {},
  oe = mt(dt),
  de = mt(!1),
  _t = dt;
function qt(e, t) {
  var n = e.type.contextTypes;
  if (!n) return dt;
  var r = e.stateNode;
  if (r && r.__reactInternalMemoizedUnmaskedChildContext === t)
    return r.__reactInternalMemoizedMaskedChildContext;
  var l = {},
    o;
  for (o in n) l[o] = t[o];
  return (
    r &&
      ((e = e.stateNode),
      (e.__reactInternalMemoizedUnmaskedChildContext = t),
      (e.__reactInternalMemoizedMaskedChildContext = l)),
    l
  );
}
function pe(e) {
  return ((e = e.childContextTypes), e != null);
}
function Br() {
  (I(de), I(oe));
}
function ki(e, t, n) {
  if (oe.current !== dt) throw Error(y(168));
  (D(oe, t), D(de, n));
}
function fa(e, t, n) {
  var r = e.stateNode;
  if (((t = t.childContextTypes), typeof r.getChildContext != 'function')) return n;
  r = r.getChildContext();
  for (var l in r) if (!(l in t)) throw Error(y(108, qc(e) || 'Unknown', l));
  return $({}, n, r);
}
function Wr(e) {
  return (
    (e = ((e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext) || dt),
    (_t = oe.current),
    D(oe, e),
    D(de, de.current),
    !0
  );
}
function xi(e, t, n) {
  var r = e.stateNode;
  if (!r) throw Error(y(169));
  (n
    ? ((e = fa(e, t, _t)),
      (r.__reactInternalMemoizedMergedChildContext = e),
      I(de),
      I(oe),
      D(oe, e))
    : I(de),
    D(de, n));
}
var $e = null,
  al = !1,
  $l = !1;
function da(e) {
  $e === null ? ($e = [e]) : $e.push(e);
}
function vd(e) {
  ((al = !0), da(e));
}
function ht() {
  if (!$l && $e !== null) {
    $l = !0;
    var e = 0,
      t = O;
    try {
      var n = $e;
      for (O = 1; e < n.length; e++) {
        var r = n[e];
        do r = r(!0);
        while (r !== null);
      }
      (($e = null), (al = !1));
    } catch (l) {
      throw ($e !== null && ($e = $e.slice(e + 1)), Fs(ru, ht), l);
    } finally {
      ((O = t), ($l = !1));
    }
  }
  return null;
}
var Vt = [],
  $t = 0,
  Hr = null,
  Qr = 0,
  ke = [],
  xe = 0,
  Nt = null,
  Be = 1,
  We = '';
function gt(e, t) {
  ((Vt[$t++] = Qr), (Vt[$t++] = Hr), (Hr = e), (Qr = t));
}
function pa(e, t, n) {
  ((ke[xe++] = Be), (ke[xe++] = We), (ke[xe++] = Nt), (Nt = e));
  var r = Be;
  e = We;
  var l = 32 - Re(r) - 1;
  ((r &= ~(1 << l)), (n += 1));
  var o = 32 - Re(t) + l;
  if (30 < o) {
    var u = l - (l % 5);
    ((o = (r & ((1 << u) - 1)).toString(32)),
      (r >>= u),
      (l -= u),
      (Be = (1 << (32 - Re(t) + l)) | (n << l) | r),
      (We = o + e));
  } else ((Be = (1 << o) | (n << l) | r), (We = e));
}
function du(e) {
  e.return !== null && (gt(e, 1), pa(e, 1, 0));
}
function pu(e) {
  for (; e === Hr; ) ((Hr = Vt[--$t]), (Vt[$t] = null), (Qr = Vt[--$t]), (Vt[$t] = null));
  for (; e === Nt; )
    ((Nt = ke[--xe]),
      (ke[xe] = null),
      (We = ke[--xe]),
      (ke[xe] = null),
      (Be = ke[--xe]),
      (ke[xe] = null));
}
var ye = null,
  ve = null,
  A = !1,
  je = null;
function ma(e, t) {
  var n = Ee(5, null, null, 0);
  ((n.elementType = 'DELETED'),
    (n.stateNode = t),
    (n.return = e),
    (t = e.deletions),
    t === null ? ((e.deletions = [n]), (e.flags |= 16)) : t.push(n));
}
function Ei(e, t) {
  switch (e.tag) {
    case 5:
      var n = e.type;
      return (
        (t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t),
        t !== null ? ((e.stateNode = t), (ye = e), (ve = ut(t.firstChild)), !0) : !1
      );
    case 6:
      return (
        (t = e.pendingProps === '' || t.nodeType !== 3 ? null : t),
        t !== null ? ((e.stateNode = t), (ye = e), (ve = null), !0) : !1
      );
    case 13:
      return (
        (t = t.nodeType !== 8 ? null : t),
        t !== null
          ? ((n = Nt !== null ? { id: Be, overflow: We } : null),
            (e.memoizedState = { dehydrated: t, treeContext: n, retryLane: 1073741824 }),
            (n = Ee(18, null, null, 0)),
            (n.stateNode = t),
            (n.return = e),
            (e.child = n),
            (ye = e),
            (ve = null),
            !0)
          : !1
      );
    default:
      return !1;
  }
}
function No(e) {
  return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
}
function Po(e) {
  if (A) {
    var t = ve;
    if (t) {
      var n = t;
      if (!Ei(e, t)) {
        if (No(e)) throw Error(y(418));
        t = ut(n.nextSibling);
        var r = ye;
        t && Ei(e, t) ? ma(r, n) : ((e.flags = (e.flags & -4097) | 2), (A = !1), (ye = e));
      }
    } else {
      if (No(e)) throw Error(y(418));
      ((e.flags = (e.flags & -4097) | 2), (A = !1), (ye = e));
    }
  }
}
function Ci(e) {
  for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
  ye = e;
}
function hr(e) {
  if (e !== ye) return !1;
  if (!A) return (Ci(e), (A = !0), !1);
  var t;
  if (
    ((t = e.tag !== 3) &&
      !(t = e.tag !== 5) &&
      ((t = e.type), (t = t !== 'head' && t !== 'body' && !xo(e.type, e.memoizedProps))),
    t && (t = ve))
  ) {
    if (No(e)) throw (ha(), Error(y(418)));
    for (; t; ) (ma(e, t), (t = ut(t.nextSibling)));
  }
  if ((Ci(e), e.tag === 13)) {
    if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e)) throw Error(y(317));
    e: {
      for (e = e.nextSibling, t = 0; e; ) {
        if (e.nodeType === 8) {
          var n = e.data;
          if (n === '/$') {
            if (t === 0) {
              ve = ut(e.nextSibling);
              break e;
            }
            t--;
          } else (n !== '$' && n !== '$!' && n !== '$?') || t++;
        }
        e = e.nextSibling;
      }
      ve = null;
    }
  } else ve = ye ? ut(e.stateNode.nextSibling) : null;
  return !0;
}
function ha() {
  for (var e = ve; e; ) e = ut(e.nextSibling);
}
function bt() {
  ((ve = ye = null), (A = !1));
}
function mu(e) {
  je === null ? (je = [e]) : je.push(e);
}
var yd = Xe.ReactCurrentBatchConfig;
function vn(e, t, n) {
  if (((e = n.ref), e !== null && typeof e != 'function' && typeof e != 'object')) {
    if (n._owner) {
      if (((n = n._owner), n)) {
        if (n.tag !== 1) throw Error(y(309));
        var r = n.stateNode;
      }
      if (!r) throw Error(y(147, e));
      var l = r,
        o = '' + e;
      return t !== null && t.ref !== null && typeof t.ref == 'function' && t.ref._stringRef === o
        ? t.ref
        : ((t = function (u) {
            var i = l.refs;
            u === null ? delete i[o] : (i[o] = u);
          }),
          (t._stringRef = o),
          t);
    }
    if (typeof e != 'string') throw Error(y(284));
    if (!n._owner) throw Error(y(290, e));
  }
  return e;
}
function vr(e, t) {
  throw (
    (e = Object.prototype.toString.call(t)),
    Error(
      y(31, e === '[object Object]' ? 'object with keys {' + Object.keys(t).join(', ') + '}' : e)
    )
  );
}
function _i(e) {
  var t = e._init;
  return t(e._payload);
}
function va(e) {
  function t(f, a) {
    if (e) {
      var d = f.deletions;
      d === null ? ((f.deletions = [a]), (f.flags |= 16)) : d.push(a);
    }
  }
  function n(f, a) {
    if (!e) return null;
    for (; a !== null; ) (t(f, a), (a = a.sibling));
    return null;
  }
  function r(f, a) {
    for (f = new Map(); a !== null; )
      (a.key !== null ? f.set(a.key, a) : f.set(a.index, a), (a = a.sibling));
    return f;
  }
  function l(f, a) {
    return ((f = ct(f, a)), (f.index = 0), (f.sibling = null), f);
  }
  function o(f, a, d) {
    return (
      (f.index = d),
      e
        ? ((d = f.alternate),
          d !== null ? ((d = d.index), d < a ? ((f.flags |= 2), a) : d) : ((f.flags |= 2), a))
        : ((f.flags |= 1048576), a)
    );
  }
  function u(f) {
    return (e && f.alternate === null && (f.flags |= 2), f);
  }
  function i(f, a, d, v) {
    return a === null || a.tag !== 6
      ? ((a = Yl(d, f.mode, v)), (a.return = f), a)
      : ((a = l(a, d)), (a.return = f), a);
  }
  function s(f, a, d, v) {
    var x = d.type;
    return x === Dt
      ? m(f, a, d.props.children, v, d.key)
      : a !== null &&
          (a.elementType === x ||
            (typeof x == 'object' && x !== null && x.$$typeof === Je && _i(x) === a.type))
        ? ((v = l(a, d.props)), (v.ref = vn(f, a, d)), (v.return = f), v)
        : ((v = Rr(d.type, d.key, d.props, null, f.mode, v)),
          (v.ref = vn(f, a, d)),
          (v.return = f),
          v);
  }
  function c(f, a, d, v) {
    return a === null ||
      a.tag !== 4 ||
      a.stateNode.containerInfo !== d.containerInfo ||
      a.stateNode.implementation !== d.implementation
      ? ((a = Xl(d, f.mode, v)), (a.return = f), a)
      : ((a = l(a, d.children || [])), (a.return = f), a);
  }
  function m(f, a, d, v, x) {
    return a === null || a.tag !== 7
      ? ((a = Ct(d, f.mode, v, x)), (a.return = f), a)
      : ((a = l(a, d)), (a.return = f), a);
  }
  function h(f, a, d) {
    if ((typeof a == 'string' && a !== '') || typeof a == 'number')
      return ((a = Yl('' + a, f.mode, d)), (a.return = f), a);
    if (typeof a == 'object' && a !== null) {
      switch (a.$$typeof) {
        case or:
          return (
            (d = Rr(a.type, a.key, a.props, null, f.mode, d)),
            (d.ref = vn(f, null, a)),
            (d.return = f),
            d
          );
        case Ot:
          return ((a = Xl(a, f.mode, d)), (a.return = f), a);
        case Je:
          var v = a._init;
          return h(f, v(a._payload), d);
      }
      if (Sn(a) || fn(a)) return ((a = Ct(a, f.mode, d, null)), (a.return = f), a);
      vr(f, a);
    }
    return null;
  }
  function p(f, a, d, v) {
    var x = a !== null ? a.key : null;
    if ((typeof d == 'string' && d !== '') || typeof d == 'number')
      return x !== null ? null : i(f, a, '' + d, v);
    if (typeof d == 'object' && d !== null) {
      switch (d.$$typeof) {
        case or:
          return d.key === x ? s(f, a, d, v) : null;
        case Ot:
          return d.key === x ? c(f, a, d, v) : null;
        case Je:
          return ((x = d._init), p(f, a, x(d._payload), v));
      }
      if (Sn(d) || fn(d)) return x !== null ? null : m(f, a, d, v, null);
      vr(f, d);
    }
    return null;
  }
  function g(f, a, d, v, x) {
    if ((typeof v == 'string' && v !== '') || typeof v == 'number')
      return ((f = f.get(d) || null), i(a, f, '' + v, x));
    if (typeof v == 'object' && v !== null) {
      switch (v.$$typeof) {
        case or:
          return ((f = f.get(v.key === null ? d : v.key) || null), s(a, f, v, x));
        case Ot:
          return ((f = f.get(v.key === null ? d : v.key) || null), c(a, f, v, x));
        case Je:
          var C = v._init;
          return g(f, a, d, C(v._payload), x);
      }
      if (Sn(v) || fn(v)) return ((f = f.get(d) || null), m(a, f, v, x, null));
      vr(a, v);
    }
    return null;
  }
  function w(f, a, d, v) {
    for (var x = null, C = null, _ = a, N = (a = 0), W = null; _ !== null && N < d.length; N++) {
      _.index > N ? ((W = _), (_ = null)) : (W = _.sibling);
      var j = p(f, _, d[N], v);
      if (j === null) {
        _ === null && (_ = W);
        break;
      }
      (e && _ && j.alternate === null && t(f, _),
        (a = o(j, a, N)),
        C === null ? (x = j) : (C.sibling = j),
        (C = j),
        (_ = W));
    }
    if (N === d.length) return (n(f, _), A && gt(f, N), x);
    if (_ === null) {
      for (; N < d.length; N++)
        ((_ = h(f, d[N], v)),
          _ !== null && ((a = o(_, a, N)), C === null ? (x = _) : (C.sibling = _), (C = _)));
      return (A && gt(f, N), x);
    }
    for (_ = r(f, _); N < d.length; N++)
      ((W = g(_, f, N, d[N], v)),
        W !== null &&
          (e && W.alternate !== null && _.delete(W.key === null ? N : W.key),
          (a = o(W, a, N)),
          C === null ? (x = W) : (C.sibling = W),
          (C = W)));
    return (
      e &&
        _.forEach(function (Pe) {
          return t(f, Pe);
        }),
      A && gt(f, N),
      x
    );
  }
  function S(f, a, d, v) {
    var x = fn(d);
    if (typeof x != 'function') throw Error(y(150));
    if (((d = x.call(d)), d == null)) throw Error(y(151));
    for (
      var C = (x = null), _ = a, N = (a = 0), W = null, j = d.next();
      _ !== null && !j.done;
      N++, j = d.next()
    ) {
      _.index > N ? ((W = _), (_ = null)) : (W = _.sibling);
      var Pe = p(f, _, j.value, v);
      if (Pe === null) {
        _ === null && (_ = W);
        break;
      }
      (e && _ && Pe.alternate === null && t(f, _),
        (a = o(Pe, a, N)),
        C === null ? (x = Pe) : (C.sibling = Pe),
        (C = Pe),
        (_ = W));
    }
    if (j.done) return (n(f, _), A && gt(f, N), x);
    if (_ === null) {
      for (; !j.done; N++, j = d.next())
        ((j = h(f, j.value, v)),
          j !== null && ((a = o(j, a, N)), C === null ? (x = j) : (C.sibling = j), (C = j)));
      return (A && gt(f, N), x);
    }
    for (_ = r(f, _); !j.done; N++, j = d.next())
      ((j = g(_, f, N, j.value, v)),
        j !== null &&
          (e && j.alternate !== null && _.delete(j.key === null ? N : j.key),
          (a = o(j, a, N)),
          C === null ? (x = j) : (C.sibling = j),
          (C = j)));
    return (
      e &&
        _.forEach(function (an) {
          return t(f, an);
        }),
      A && gt(f, N),
      x
    );
  }
  function F(f, a, d, v) {
    if (
      (typeof d == 'object' &&
        d !== null &&
        d.type === Dt &&
        d.key === null &&
        (d = d.props.children),
      typeof d == 'object' && d !== null)
    ) {
      switch (d.$$typeof) {
        case or:
          e: {
            for (var x = d.key, C = a; C !== null; ) {
              if (C.key === x) {
                if (((x = d.type), x === Dt)) {
                  if (C.tag === 7) {
                    (n(f, C.sibling), (a = l(C, d.props.children)), (a.return = f), (f = a));
                    break e;
                  }
                } else if (
                  C.elementType === x ||
                  (typeof x == 'object' && x !== null && x.$$typeof === Je && _i(x) === C.type)
                ) {
                  (n(f, C.sibling),
                    (a = l(C, d.props)),
                    (a.ref = vn(f, C, d)),
                    (a.return = f),
                    (f = a));
                  break e;
                }
                n(f, C);
                break;
              } else t(f, C);
              C = C.sibling;
            }
            d.type === Dt
              ? ((a = Ct(d.props.children, f.mode, v, d.key)), (a.return = f), (f = a))
              : ((v = Rr(d.type, d.key, d.props, null, f.mode, v)),
                (v.ref = vn(f, a, d)),
                (v.return = f),
                (f = v));
          }
          return u(f);
        case Ot:
          e: {
            for (C = d.key; a !== null; ) {
              if (a.key === C)
                if (
                  a.tag === 4 &&
                  a.stateNode.containerInfo === d.containerInfo &&
                  a.stateNode.implementation === d.implementation
                ) {
                  (n(f, a.sibling), (a = l(a, d.children || [])), (a.return = f), (f = a));
                  break e;
                } else {
                  n(f, a);
                  break;
                }
              else t(f, a);
              a = a.sibling;
            }
            ((a = Xl(d, f.mode, v)), (a.return = f), (f = a));
          }
          return u(f);
        case Je:
          return ((C = d._init), F(f, a, C(d._payload), v));
      }
      if (Sn(d)) return w(f, a, d, v);
      if (fn(d)) return S(f, a, d, v);
      vr(f, d);
    }
    return (typeof d == 'string' && d !== '') || typeof d == 'number'
      ? ((d = '' + d),
        a !== null && a.tag === 6
          ? (n(f, a.sibling), (a = l(a, d)), (a.return = f), (f = a))
          : (n(f, a), (a = Yl(d, f.mode, v)), (a.return = f), (f = a)),
        u(f))
      : n(f, a);
  }
  return F;
}
var en = va(!0),
  ya = va(!1),
  Kr = mt(null),
  Gr = null,
  Bt = null,
  hu = null;
function vu() {
  hu = Bt = Gr = null;
}
function yu(e) {
  var t = Kr.current;
  (I(Kr), (e._currentValue = t));
}
function zo(e, t, n) {
  for (; e !== null; ) {
    var r = e.alternate;
    if (
      ((e.childLanes & t) !== t
        ? ((e.childLanes |= t), r !== null && (r.childLanes |= t))
        : r !== null && (r.childLanes & t) !== t && (r.childLanes |= t),
      e === n)
    )
      break;
    e = e.return;
  }
}
function Xt(e, t) {
  ((Gr = e),
    (hu = Bt = null),
    (e = e.dependencies),
    e !== null && e.firstContext !== null && (e.lanes & t && (fe = !0), (e.firstContext = null)));
}
function _e(e) {
  var t = e._currentValue;
  if (hu !== e)
    if (((e = { context: e, memoizedValue: t, next: null }), Bt === null)) {
      if (Gr === null) throw Error(y(308));
      ((Bt = e), (Gr.dependencies = { lanes: 0, firstContext: e }));
    } else Bt = Bt.next = e;
  return t;
}
var kt = null;
function gu(e) {
  kt === null ? (kt = [e]) : kt.push(e);
}
function ga(e, t, n, r) {
  var l = t.interleaved;
  return (
    l === null ? ((n.next = n), gu(t)) : ((n.next = l.next), (l.next = n)),
    (t.interleaved = n),
    Ge(e, r)
  );
}
function Ge(e, t) {
  e.lanes |= t;
  var n = e.alternate;
  for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; )
    ((e.childLanes |= t),
      (n = e.alternate),
      n !== null && (n.childLanes |= t),
      (n = e),
      (e = e.return));
  return n.tag === 3 ? n.stateNode : null;
}
var qe = !1;
function wu(e) {
  e.updateQueue = {
    baseState: e.memoizedState,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: { pending: null, interleaved: null, lanes: 0 },
    effects: null,
  };
}
function wa(e, t) {
  ((e = e.updateQueue),
    t.updateQueue === e &&
      (t.updateQueue = {
        baseState: e.baseState,
        firstBaseUpdate: e.firstBaseUpdate,
        lastBaseUpdate: e.lastBaseUpdate,
        shared: e.shared,
        effects: e.effects,
      }));
}
function He(e, t) {
  return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null };
}
function it(e, t, n) {
  var r = e.updateQueue;
  if (r === null) return null;
  if (((r = r.shared), R & 2)) {
    var l = r.pending;
    return (
      l === null ? (t.next = t) : ((t.next = l.next), (l.next = t)),
      (r.pending = t),
      Ge(e, n)
    );
  }
  return (
    (l = r.interleaved),
    l === null ? ((t.next = t), gu(r)) : ((t.next = l.next), (l.next = t)),
    (r.interleaved = t),
    Ge(e, n)
  );
}
function Nr(e, t, n) {
  if (((t = t.updateQueue), t !== null && ((t = t.shared), (n & 4194240) !== 0))) {
    var r = t.lanes;
    ((r &= e.pendingLanes), (n |= r), (t.lanes = n), lu(e, n));
  }
}
function Ni(e, t) {
  var n = e.updateQueue,
    r = e.alternate;
  if (r !== null && ((r = r.updateQueue), n === r)) {
    var l = null,
      o = null;
    if (((n = n.firstBaseUpdate), n !== null)) {
      do {
        var u = {
          eventTime: n.eventTime,
          lane: n.lane,
          tag: n.tag,
          payload: n.payload,
          callback: n.callback,
          next: null,
        };
        (o === null ? (l = o = u) : (o = o.next = u), (n = n.next));
      } while (n !== null);
      o === null ? (l = o = t) : (o = o.next = t);
    } else l = o = t;
    ((n = {
      baseState: r.baseState,
      firstBaseUpdate: l,
      lastBaseUpdate: o,
      shared: r.shared,
      effects: r.effects,
    }),
      (e.updateQueue = n));
    return;
  }
  ((e = n.lastBaseUpdate),
    e === null ? (n.firstBaseUpdate = t) : (e.next = t),
    (n.lastBaseUpdate = t));
}
function Yr(e, t, n, r) {
  var l = e.updateQueue;
  qe = !1;
  var o = l.firstBaseUpdate,
    u = l.lastBaseUpdate,
    i = l.shared.pending;
  if (i !== null) {
    l.shared.pending = null;
    var s = i,
      c = s.next;
    ((s.next = null), u === null ? (o = c) : (u.next = c), (u = s));
    var m = e.alternate;
    m !== null &&
      ((m = m.updateQueue),
      (i = m.lastBaseUpdate),
      i !== u && (i === null ? (m.firstBaseUpdate = c) : (i.next = c), (m.lastBaseUpdate = s)));
  }
  if (o !== null) {
    var h = l.baseState;
    ((u = 0), (m = c = s = null), (i = o));
    do {
      var p = i.lane,
        g = i.eventTime;
      if ((r & p) === p) {
        m !== null &&
          (m = m.next =
            {
              eventTime: g,
              lane: 0,
              tag: i.tag,
              payload: i.payload,
              callback: i.callback,
              next: null,
            });
        e: {
          var w = e,
            S = i;
          switch (((p = t), (g = n), S.tag)) {
            case 1:
              if (((w = S.payload), typeof w == 'function')) {
                h = w.call(g, h, p);
                break e;
              }
              h = w;
              break e;
            case 3:
              w.flags = (w.flags & -65537) | 128;
            case 0:
              if (((w = S.payload), (p = typeof w == 'function' ? w.call(g, h, p) : w), p == null))
                break e;
              h = $({}, h, p);
              break e;
            case 2:
              qe = !0;
          }
        }
        i.callback !== null &&
          i.lane !== 0 &&
          ((e.flags |= 64), (p = l.effects), p === null ? (l.effects = [i]) : p.push(i));
      } else
        ((g = {
          eventTime: g,
          lane: p,
          tag: i.tag,
          payload: i.payload,
          callback: i.callback,
          next: null,
        }),
          m === null ? ((c = m = g), (s = h)) : (m = m.next = g),
          (u |= p));
      if (((i = i.next), i === null)) {
        if (((i = l.shared.pending), i === null)) break;
        ((p = i), (i = p.next), (p.next = null), (l.lastBaseUpdate = p), (l.shared.pending = null));
      }
    } while (!0);
    if (
      (m === null && (s = h),
      (l.baseState = s),
      (l.firstBaseUpdate = c),
      (l.lastBaseUpdate = m),
      (t = l.shared.interleaved),
      t !== null)
    ) {
      l = t;
      do ((u |= l.lane), (l = l.next));
      while (l !== t);
    } else o === null && (l.shared.lanes = 0);
    ((zt |= u), (e.lanes = u), (e.memoizedState = h));
  }
}
function Pi(e, t, n) {
  if (((e = t.effects), (t.effects = null), e !== null))
    for (t = 0; t < e.length; t++) {
      var r = e[t],
        l = r.callback;
      if (l !== null) {
        if (((r.callback = null), (r = n), typeof l != 'function')) throw Error(y(191, l));
        l.call(r);
      }
    }
}
var er = {},
  Ue = mt(er),
  Wn = mt(er),
  Hn = mt(er);
function xt(e) {
  if (e === er) throw Error(y(174));
  return e;
}
function Su(e, t) {
  switch ((D(Hn, t), D(Wn, e), D(Ue, er), (e = t.nodeType), e)) {
    case 9:
    case 11:
      t = (t = t.documentElement) ? t.namespaceURI : io(null, '');
      break;
    default:
      ((e = e === 8 ? t.parentNode : t),
        (t = e.namespaceURI || null),
        (e = e.tagName),
        (t = io(t, e)));
  }
  (I(Ue), D(Ue, t));
}
function tn() {
  (I(Ue), I(Wn), I(Hn));
}
function Sa(e) {
  xt(Hn.current);
  var t = xt(Ue.current),
    n = io(t, e.type);
  t !== n && (D(Wn, e), D(Ue, n));
}
function ku(e) {
  Wn.current === e && (I(Ue), I(Wn));
}
var U = mt(0);
function Xr(e) {
  for (var t = e; t !== null; ) {
    if (t.tag === 13) {
      var n = t.memoizedState;
      if (n !== null && ((n = n.dehydrated), n === null || n.data === '$?' || n.data === '$!'))
        return t;
    } else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
      if (t.flags & 128) return t;
    } else if (t.child !== null) {
      ((t.child.return = t), (t = t.child));
      continue;
    }
    if (t === e) break;
    for (; t.sibling === null; ) {
      if (t.return === null || t.return === e) return null;
      t = t.return;
    }
    ((t.sibling.return = t.return), (t = t.sibling));
  }
  return null;
}
var Bl = [];
function xu() {
  for (var e = 0; e < Bl.length; e++) Bl[e]._workInProgressVersionPrimary = null;
  Bl.length = 0;
}
var Pr = Xe.ReactCurrentDispatcher,
  Wl = Xe.ReactCurrentBatchConfig,
  Pt = 0,
  V = null,
  Y = null,
  J = null,
  Zr = !1,
  zn = !1,
  Qn = 0,
  gd = 0;
function ne() {
  throw Error(y(321));
}
function Eu(e, t) {
  if (t === null) return !1;
  for (var n = 0; n < t.length && n < e.length; n++) if (!De(e[n], t[n])) return !1;
  return !0;
}
function Cu(e, t, n, r, l, o) {
  if (
    ((Pt = o),
    (V = t),
    (t.memoizedState = null),
    (t.updateQueue = null),
    (t.lanes = 0),
    (Pr.current = e === null || e.memoizedState === null ? xd : Ed),
    (e = n(r, l)),
    zn)
  ) {
    o = 0;
    do {
      if (((zn = !1), (Qn = 0), 25 <= o)) throw Error(y(301));
      ((o += 1), (J = Y = null), (t.updateQueue = null), (Pr.current = Cd), (e = n(r, l)));
    } while (zn);
  }
  if (
    ((Pr.current = Jr),
    (t = Y !== null && Y.next !== null),
    (Pt = 0),
    (J = Y = V = null),
    (Zr = !1),
    t)
  )
    throw Error(y(300));
  return e;
}
function _u() {
  var e = Qn !== 0;
  return ((Qn = 0), e);
}
function Ie() {
  var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
  return (J === null ? (V.memoizedState = J = e) : (J = J.next = e), J);
}
function Ne() {
  if (Y === null) {
    var e = V.alternate;
    e = e !== null ? e.memoizedState : null;
  } else e = Y.next;
  var t = J === null ? V.memoizedState : J.next;
  if (t !== null) ((J = t), (Y = e));
  else {
    if (e === null) throw Error(y(310));
    ((Y = e),
      (e = {
        memoizedState: Y.memoizedState,
        baseState: Y.baseState,
        baseQueue: Y.baseQueue,
        queue: Y.queue,
        next: null,
      }),
      J === null ? (V.memoizedState = J = e) : (J = J.next = e));
  }
  return J;
}
function Kn(e, t) {
  return typeof t == 'function' ? t(e) : t;
}
function Hl(e) {
  var t = Ne(),
    n = t.queue;
  if (n === null) throw Error(y(311));
  n.lastRenderedReducer = e;
  var r = Y,
    l = r.baseQueue,
    o = n.pending;
  if (o !== null) {
    if (l !== null) {
      var u = l.next;
      ((l.next = o.next), (o.next = u));
    }
    ((r.baseQueue = l = o), (n.pending = null));
  }
  if (l !== null) {
    ((o = l.next), (r = r.baseState));
    var i = (u = null),
      s = null,
      c = o;
    do {
      var m = c.lane;
      if ((Pt & m) === m)
        (s !== null &&
          (s = s.next =
            {
              lane: 0,
              action: c.action,
              hasEagerState: c.hasEagerState,
              eagerState: c.eagerState,
              next: null,
            }),
          (r = c.hasEagerState ? c.eagerState : e(r, c.action)));
      else {
        var h = {
          lane: m,
          action: c.action,
          hasEagerState: c.hasEagerState,
          eagerState: c.eagerState,
          next: null,
        };
        (s === null ? ((i = s = h), (u = r)) : (s = s.next = h), (V.lanes |= m), (zt |= m));
      }
      c = c.next;
    } while (c !== null && c !== o);
    (s === null ? (u = r) : (s.next = i),
      De(r, t.memoizedState) || (fe = !0),
      (t.memoizedState = r),
      (t.baseState = u),
      (t.baseQueue = s),
      (n.lastRenderedState = r));
  }
  if (((e = n.interleaved), e !== null)) {
    l = e;
    do ((o = l.lane), (V.lanes |= o), (zt |= o), (l = l.next));
    while (l !== e);
  } else l === null && (n.lanes = 0);
  return [t.memoizedState, n.dispatch];
}
function Ql(e) {
  var t = Ne(),
    n = t.queue;
  if (n === null) throw Error(y(311));
  n.lastRenderedReducer = e;
  var r = n.dispatch,
    l = n.pending,
    o = t.memoizedState;
  if (l !== null) {
    n.pending = null;
    var u = (l = l.next);
    do ((o = e(o, u.action)), (u = u.next));
    while (u !== l);
    (De(o, t.memoizedState) || (fe = !0),
      (t.memoizedState = o),
      t.baseQueue === null && (t.baseState = o),
      (n.lastRenderedState = o));
  }
  return [o, r];
}
function ka() {}
function xa(e, t) {
  var n = V,
    r = Ne(),
    l = t(),
    o = !De(r.memoizedState, l);
  if (
    (o && ((r.memoizedState = l), (fe = !0)),
    (r = r.queue),
    Nu(_a.bind(null, n, r, e), [e]),
    r.getSnapshot !== t || o || (J !== null && J.memoizedState.tag & 1))
  ) {
    if (((n.flags |= 2048), Gn(9, Ca.bind(null, n, r, l, t), void 0, null), q === null))
      throw Error(y(349));
    Pt & 30 || Ea(n, t, l);
  }
  return l;
}
function Ea(e, t, n) {
  ((e.flags |= 16384),
    (e = { getSnapshot: t, value: n }),
    (t = V.updateQueue),
    t === null
      ? ((t = { lastEffect: null, stores: null }), (V.updateQueue = t), (t.stores = [e]))
      : ((n = t.stores), n === null ? (t.stores = [e]) : n.push(e)));
}
function Ca(e, t, n, r) {
  ((t.value = n), (t.getSnapshot = r), Na(t) && Pa(e));
}
function _a(e, t, n) {
  return n(function () {
    Na(t) && Pa(e);
  });
}
function Na(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !De(e, n);
  } catch {
    return !0;
  }
}
function Pa(e) {
  var t = Ge(e, 1);
  t !== null && Oe(t, e, 1, -1);
}
function zi(e) {
  var t = Ie();
  return (
    typeof e == 'function' && (e = e()),
    (t.memoizedState = t.baseState = e),
    (e = {
      pending: null,
      interleaved: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: Kn,
      lastRenderedState: e,
    }),
    (t.queue = e),
    (e = e.dispatch = kd.bind(null, V, e)),
    [t.memoizedState, e]
  );
}
function Gn(e, t, n, r) {
  return (
    (e = { tag: e, create: t, destroy: n, deps: r, next: null }),
    (t = V.updateQueue),
    t === null
      ? ((t = { lastEffect: null, stores: null }), (V.updateQueue = t), (t.lastEffect = e.next = e))
      : ((n = t.lastEffect),
        n === null
          ? (t.lastEffect = e.next = e)
          : ((r = n.next), (n.next = e), (e.next = r), (t.lastEffect = e))),
    e
  );
}
function za() {
  return Ne().memoizedState;
}
function zr(e, t, n, r) {
  var l = Ie();
  ((V.flags |= e), (l.memoizedState = Gn(1 | t, n, void 0, r === void 0 ? null : r)));
}
function cl(e, t, n, r) {
  var l = Ne();
  r = r === void 0 ? null : r;
  var o = void 0;
  if (Y !== null) {
    var u = Y.memoizedState;
    if (((o = u.destroy), r !== null && Eu(r, u.deps))) {
      l.memoizedState = Gn(t, n, o, r);
      return;
    }
  }
  ((V.flags |= e), (l.memoizedState = Gn(1 | t, n, o, r)));
}
function Ti(e, t) {
  return zr(8390656, 8, e, t);
}
function Nu(e, t) {
  return cl(2048, 8, e, t);
}
function Ta(e, t) {
  return cl(4, 2, e, t);
}
function La(e, t) {
  return cl(4, 4, e, t);
}
function ja(e, t) {
  if (typeof t == 'function')
    return (
      (e = e()),
      t(e),
      function () {
        t(null);
      }
    );
  if (t != null)
    return (
      (e = e()),
      (t.current = e),
      function () {
        t.current = null;
      }
    );
}
function Ra(e, t, n) {
  return ((n = n != null ? n.concat([e]) : null), cl(4, 4, ja.bind(null, t, e), n));
}
function Pu() {}
function Oa(e, t) {
  var n = Ne();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && Eu(t, r[1]) ? r[0] : ((n.memoizedState = [e, t]), e);
}
function Da(e, t) {
  var n = Ne();
  t = t === void 0 ? null : t;
  var r = n.memoizedState;
  return r !== null && t !== null && Eu(t, r[1])
    ? r[0]
    : ((e = e()), (n.memoizedState = [e, t]), e);
}
function Ma(e, t, n) {
  return Pt & 21
    ? (De(n, t) || ((n = Vs()), (V.lanes |= n), (zt |= n), (e.baseState = !0)), t)
    : (e.baseState && ((e.baseState = !1), (fe = !0)), (e.memoizedState = n));
}
function wd(e, t) {
  var n = O;
  ((O = n !== 0 && 4 > n ? n : 4), e(!0));
  var r = Wl.transition;
  Wl.transition = {};
  try {
    (e(!1), t());
  } finally {
    ((O = n), (Wl.transition = r));
  }
}
function Ia() {
  return Ne().memoizedState;
}
function Sd(e, t, n) {
  var r = at(e);
  if (((n = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null }), Fa(e)))
    Aa(t, n);
  else if (((n = ga(e, t, n, r)), n !== null)) {
    var l = ie();
    (Oe(n, e, r, l), Ua(n, t, r));
  }
}
function kd(e, t, n) {
  var r = at(e),
    l = { lane: r, action: n, hasEagerState: !1, eagerState: null, next: null };
  if (Fa(e)) Aa(t, l);
  else {
    var o = e.alternate;
    if (e.lanes === 0 && (o === null || o.lanes === 0) && ((o = t.lastRenderedReducer), o !== null))
      try {
        var u = t.lastRenderedState,
          i = o(u, n);
        if (((l.hasEagerState = !0), (l.eagerState = i), De(i, u))) {
          var s = t.interleaved;
          (s === null ? ((l.next = l), gu(t)) : ((l.next = s.next), (s.next = l)),
            (t.interleaved = l));
          return;
        }
      } catch {
      } finally {
      }
    ((n = ga(e, t, l, r)), n !== null && ((l = ie()), Oe(n, e, r, l), Ua(n, t, r)));
  }
}
function Fa(e) {
  var t = e.alternate;
  return e === V || (t !== null && t === V);
}
function Aa(e, t) {
  zn = Zr = !0;
  var n = e.pending;
  (n === null ? (t.next = t) : ((t.next = n.next), (n.next = t)), (e.pending = t));
}
function Ua(e, t, n) {
  if (n & 4194240) {
    var r = t.lanes;
    ((r &= e.pendingLanes), (n |= r), (t.lanes = n), lu(e, n));
  }
}
var Jr = {
    readContext: _e,
    useCallback: ne,
    useContext: ne,
    useEffect: ne,
    useImperativeHandle: ne,
    useInsertionEffect: ne,
    useLayoutEffect: ne,
    useMemo: ne,
    useReducer: ne,
    useRef: ne,
    useState: ne,
    useDebugValue: ne,
    useDeferredValue: ne,
    useTransition: ne,
    useMutableSource: ne,
    useSyncExternalStore: ne,
    useId: ne,
    unstable_isNewReconciler: !1,
  },
  xd = {
    readContext: _e,
    useCallback: function (e, t) {
      return ((Ie().memoizedState = [e, t === void 0 ? null : t]), e);
    },
    useContext: _e,
    useEffect: Ti,
    useImperativeHandle: function (e, t, n) {
      return ((n = n != null ? n.concat([e]) : null), zr(4194308, 4, ja.bind(null, t, e), n));
    },
    useLayoutEffect: function (e, t) {
      return zr(4194308, 4, e, t);
    },
    useInsertionEffect: function (e, t) {
      return zr(4, 2, e, t);
    },
    useMemo: function (e, t) {
      var n = Ie();
      return ((t = t === void 0 ? null : t), (e = e()), (n.memoizedState = [e, t]), e);
    },
    useReducer: function (e, t, n) {
      var r = Ie();
      return (
        (t = n !== void 0 ? n(t) : t),
        (r.memoizedState = r.baseState = t),
        (e = {
          pending: null,
          interleaved: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: e,
          lastRenderedState: t,
        }),
        (r.queue = e),
        (e = e.dispatch = Sd.bind(null, V, e)),
        [r.memoizedState, e]
      );
    },
    useRef: function (e) {
      var t = Ie();
      return ((e = { current: e }), (t.memoizedState = e));
    },
    useState: zi,
    useDebugValue: Pu,
    useDeferredValue: function (e) {
      return (Ie().memoizedState = e);
    },
    useTransition: function () {
      var e = zi(!1),
        t = e[0];
      return ((e = wd.bind(null, e[1])), (Ie().memoizedState = e), [t, e]);
    },
    useMutableSource: function () {},
    useSyncExternalStore: function (e, t, n) {
      var r = V,
        l = Ie();
      if (A) {
        if (n === void 0) throw Error(y(407));
        n = n();
      } else {
        if (((n = t()), q === null)) throw Error(y(349));
        Pt & 30 || Ea(r, t, n);
      }
      l.memoizedState = n;
      var o = { value: n, getSnapshot: t };
      return (
        (l.queue = o),
        Ti(_a.bind(null, r, o, e), [e]),
        (r.flags |= 2048),
        Gn(9, Ca.bind(null, r, o, n, t), void 0, null),
        n
      );
    },
    useId: function () {
      var e = Ie(),
        t = q.identifierPrefix;
      if (A) {
        var n = We,
          r = Be;
        ((n = (r & ~(1 << (32 - Re(r) - 1))).toString(32) + n),
          (t = ':' + t + 'R' + n),
          (n = Qn++),
          0 < n && (t += 'H' + n.toString(32)),
          (t += ':'));
      } else ((n = gd++), (t = ':' + t + 'r' + n.toString(32) + ':'));
      return (e.memoizedState = t);
    },
    unstable_isNewReconciler: !1,
  },
  Ed = {
    readContext: _e,
    useCallback: Oa,
    useContext: _e,
    useEffect: Nu,
    useImperativeHandle: Ra,
    useInsertionEffect: Ta,
    useLayoutEffect: La,
    useMemo: Da,
    useReducer: Hl,
    useRef: za,
    useState: function () {
      return Hl(Kn);
    },
    useDebugValue: Pu,
    useDeferredValue: function (e) {
      var t = Ne();
      return Ma(t, Y.memoizedState, e);
    },
    useTransition: function () {
      var e = Hl(Kn)[0],
        t = Ne().memoizedState;
      return [e, t];
    },
    useMutableSource: ka,
    useSyncExternalStore: xa,
    useId: Ia,
    unstable_isNewReconciler: !1,
  },
  Cd = {
    readContext: _e,
    useCallback: Oa,
    useContext: _e,
    useEffect: Nu,
    useImperativeHandle: Ra,
    useInsertionEffect: Ta,
    useLayoutEffect: La,
    useMemo: Da,
    useReducer: Ql,
    useRef: za,
    useState: function () {
      return Ql(Kn);
    },
    useDebugValue: Pu,
    useDeferredValue: function (e) {
      var t = Ne();
      return Y === null ? (t.memoizedState = e) : Ma(t, Y.memoizedState, e);
    },
    useTransition: function () {
      var e = Ql(Kn)[0],
        t = Ne().memoizedState;
      return [e, t];
    },
    useMutableSource: ka,
    useSyncExternalStore: xa,
    useId: Ia,
    unstable_isNewReconciler: !1,
  };
function Te(e, t) {
  if (e && e.defaultProps) {
    ((t = $({}, t)), (e = e.defaultProps));
    for (var n in e) t[n] === void 0 && (t[n] = e[n]);
    return t;
  }
  return t;
}
function To(e, t, n, r) {
  ((t = e.memoizedState),
    (n = n(r, t)),
    (n = n == null ? t : $({}, t, n)),
    (e.memoizedState = n),
    e.lanes === 0 && (e.updateQueue.baseState = n));
}
var fl = {
  isMounted: function (e) {
    return (e = e._reactInternals) ? jt(e) === e : !1;
  },
  enqueueSetState: function (e, t, n) {
    e = e._reactInternals;
    var r = ie(),
      l = at(e),
      o = He(r, l);
    ((o.payload = t),
      n != null && (o.callback = n),
      (t = it(e, o, l)),
      t !== null && (Oe(t, e, l, r), Nr(t, e, l)));
  },
  enqueueReplaceState: function (e, t, n) {
    e = e._reactInternals;
    var r = ie(),
      l = at(e),
      o = He(r, l);
    ((o.tag = 1),
      (o.payload = t),
      n != null && (o.callback = n),
      (t = it(e, o, l)),
      t !== null && (Oe(t, e, l, r), Nr(t, e, l)));
  },
  enqueueForceUpdate: function (e, t) {
    e = e._reactInternals;
    var n = ie(),
      r = at(e),
      l = He(n, r);
    ((l.tag = 2),
      t != null && (l.callback = t),
      (t = it(e, l, r)),
      t !== null && (Oe(t, e, r, n), Nr(t, e, r)));
  },
};
function Li(e, t, n, r, l, o, u) {
  return (
    (e = e.stateNode),
    typeof e.shouldComponentUpdate == 'function'
      ? e.shouldComponentUpdate(r, o, u)
      : t.prototype && t.prototype.isPureReactComponent
        ? !Un(n, r) || !Un(l, o)
        : !0
  );
}
function Va(e, t, n) {
  var r = !1,
    l = dt,
    o = t.contextType;
  return (
    typeof o == 'object' && o !== null
      ? (o = _e(o))
      : ((l = pe(t) ? _t : oe.current),
        (r = t.contextTypes),
        (o = (r = r != null) ? qt(e, l) : dt)),
    (t = new t(n, o)),
    (e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null),
    (t.updater = fl),
    (e.stateNode = t),
    (t._reactInternals = e),
    r &&
      ((e = e.stateNode),
      (e.__reactInternalMemoizedUnmaskedChildContext = l),
      (e.__reactInternalMemoizedMaskedChildContext = o)),
    t
  );
}
function ji(e, t, n, r) {
  ((e = t.state),
    typeof t.componentWillReceiveProps == 'function' && t.componentWillReceiveProps(n, r),
    typeof t.UNSAFE_componentWillReceiveProps == 'function' &&
      t.UNSAFE_componentWillReceiveProps(n, r),
    t.state !== e && fl.enqueueReplaceState(t, t.state, null));
}
function Lo(e, t, n, r) {
  var l = e.stateNode;
  ((l.props = n), (l.state = e.memoizedState), (l.refs = {}), wu(e));
  var o = t.contextType;
  (typeof o == 'object' && o !== null
    ? (l.context = _e(o))
    : ((o = pe(t) ? _t : oe.current), (l.context = qt(e, o))),
    (l.state = e.memoizedState),
    (o = t.getDerivedStateFromProps),
    typeof o == 'function' && (To(e, t, o, n), (l.state = e.memoizedState)),
    typeof t.getDerivedStateFromProps == 'function' ||
      typeof l.getSnapshotBeforeUpdate == 'function' ||
      (typeof l.UNSAFE_componentWillMount != 'function' &&
        typeof l.componentWillMount != 'function') ||
      ((t = l.state),
      typeof l.componentWillMount == 'function' && l.componentWillMount(),
      typeof l.UNSAFE_componentWillMount == 'function' && l.UNSAFE_componentWillMount(),
      t !== l.state && fl.enqueueReplaceState(l, l.state, null),
      Yr(e, n, l, r),
      (l.state = e.memoizedState)),
    typeof l.componentDidMount == 'function' && (e.flags |= 4194308));
}
function nn(e, t) {
  try {
    var n = '',
      r = t;
    do ((n += Jc(r)), (r = r.return));
    while (r);
    var l = n;
  } catch (o) {
    l =
      `
Error generating stack: ` +
      o.message +
      `
` +
      o.stack;
  }
  return { value: e, source: t, stack: l, digest: null };
}
function Kl(e, t, n) {
  return { value: e, source: null, stack: n ?? null, digest: t ?? null };
}
function jo(e, t) {
  try {
    console.error(t.value);
  } catch (n) {
    setTimeout(function () {
      throw n;
    });
  }
}
var _d = typeof WeakMap == 'function' ? WeakMap : Map;
function $a(e, t, n) {
  ((n = He(-1, n)), (n.tag = 3), (n.payload = { element: null }));
  var r = t.value;
  return (
    (n.callback = function () {
      (br || ((br = !0), ($o = r)), jo(e, t));
    }),
    n
  );
}
function Ba(e, t, n) {
  ((n = He(-1, n)), (n.tag = 3));
  var r = e.type.getDerivedStateFromError;
  if (typeof r == 'function') {
    var l = t.value;
    ((n.payload = function () {
      return r(l);
    }),
      (n.callback = function () {
        jo(e, t);
      }));
  }
  var o = e.stateNode;
  return (
    o !== null &&
      typeof o.componentDidCatch == 'function' &&
      (n.callback = function () {
        (jo(e, t), typeof r != 'function' && (st === null ? (st = new Set([this])) : st.add(this)));
        var u = t.stack;
        this.componentDidCatch(t.value, { componentStack: u !== null ? u : '' });
      }),
    n
  );
}
function Ri(e, t, n) {
  var r = e.pingCache;
  if (r === null) {
    r = e.pingCache = new _d();
    var l = new Set();
    r.set(t, l);
  } else ((l = r.get(t)), l === void 0 && ((l = new Set()), r.set(t, l)));
  l.has(n) || (l.add(n), (e = Ud.bind(null, e, t, n)), t.then(e, e));
}
function Oi(e) {
  do {
    var t;
    if (
      ((t = e.tag === 13) && ((t = e.memoizedState), (t = t !== null ? t.dehydrated !== null : !0)),
      t)
    )
      return e;
    e = e.return;
  } while (e !== null);
  return null;
}
function Di(e, t, n, r, l) {
  return e.mode & 1
    ? ((e.flags |= 65536), (e.lanes = l), e)
    : (e === t
        ? (e.flags |= 65536)
        : ((e.flags |= 128),
          (n.flags |= 131072),
          (n.flags &= -52805),
          n.tag === 1 &&
            (n.alternate === null ? (n.tag = 17) : ((t = He(-1, 1)), (t.tag = 2), it(n, t, 1))),
          (n.lanes |= 1)),
      e);
}
var Nd = Xe.ReactCurrentOwner,
  fe = !1;
function ue(e, t, n, r) {
  t.child = e === null ? ya(t, null, n, r) : en(t, e.child, n, r);
}
function Mi(e, t, n, r, l) {
  n = n.render;
  var o = t.ref;
  return (
    Xt(t, l),
    (r = Cu(e, t, n, r, o, l)),
    (n = _u()),
    e !== null && !fe
      ? ((t.updateQueue = e.updateQueue), (t.flags &= -2053), (e.lanes &= ~l), Ye(e, t, l))
      : (A && n && du(t), (t.flags |= 1), ue(e, t, r, l), t.child)
  );
}
function Ii(e, t, n, r, l) {
  if (e === null) {
    var o = n.type;
    return typeof o == 'function' &&
      !Mu(o) &&
      o.defaultProps === void 0 &&
      n.compare === null &&
      n.defaultProps === void 0
      ? ((t.tag = 15), (t.type = o), Wa(e, t, o, r, l))
      : ((e = Rr(n.type, null, r, t, t.mode, l)), (e.ref = t.ref), (e.return = t), (t.child = e));
  }
  if (((o = e.child), !(e.lanes & l))) {
    var u = o.memoizedProps;
    if (((n = n.compare), (n = n !== null ? n : Un), n(u, r) && e.ref === t.ref))
      return Ye(e, t, l);
  }
  return ((t.flags |= 1), (e = ct(o, r)), (e.ref = t.ref), (e.return = t), (t.child = e));
}
function Wa(e, t, n, r, l) {
  if (e !== null) {
    var o = e.memoizedProps;
    if (Un(o, r) && e.ref === t.ref)
      if (((fe = !1), (t.pendingProps = r = o), (e.lanes & l) !== 0)) e.flags & 131072 && (fe = !0);
      else return ((t.lanes = e.lanes), Ye(e, t, l));
  }
  return Ro(e, t, n, r, l);
}
function Ha(e, t, n) {
  var r = t.pendingProps,
    l = r.children,
    o = e !== null ? e.memoizedState : null;
  if (r.mode === 'hidden')
    if (!(t.mode & 1))
      ((t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }),
        D(Ht, he),
        (he |= n));
    else {
      if (!(n & 1073741824))
        return (
          (e = o !== null ? o.baseLanes | n : n),
          (t.lanes = t.childLanes = 1073741824),
          (t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }),
          (t.updateQueue = null),
          D(Ht, he),
          (he |= e),
          null
        );
      ((t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }),
        (r = o !== null ? o.baseLanes : n),
        D(Ht, he),
        (he |= r));
    }
  else
    (o !== null ? ((r = o.baseLanes | n), (t.memoizedState = null)) : (r = n),
      D(Ht, he),
      (he |= r));
  return (ue(e, t, l, n), t.child);
}
function Qa(e, t) {
  var n = t.ref;
  ((e === null && n !== null) || (e !== null && e.ref !== n)) &&
    ((t.flags |= 512), (t.flags |= 2097152));
}
function Ro(e, t, n, r, l) {
  var o = pe(n) ? _t : oe.current;
  return (
    (o = qt(t, o)),
    Xt(t, l),
    (n = Cu(e, t, n, r, o, l)),
    (r = _u()),
    e !== null && !fe
      ? ((t.updateQueue = e.updateQueue), (t.flags &= -2053), (e.lanes &= ~l), Ye(e, t, l))
      : (A && r && du(t), (t.flags |= 1), ue(e, t, n, l), t.child)
  );
}
function Fi(e, t, n, r, l) {
  if (pe(n)) {
    var o = !0;
    Wr(t);
  } else o = !1;
  if ((Xt(t, l), t.stateNode === null)) (Tr(e, t), Va(t, n, r), Lo(t, n, r, l), (r = !0));
  else if (e === null) {
    var u = t.stateNode,
      i = t.memoizedProps;
    u.props = i;
    var s = u.context,
      c = n.contextType;
    typeof c == 'object' && c !== null
      ? (c = _e(c))
      : ((c = pe(n) ? _t : oe.current), (c = qt(t, c)));
    var m = n.getDerivedStateFromProps,
      h = typeof m == 'function' || typeof u.getSnapshotBeforeUpdate == 'function';
    (h ||
      (typeof u.UNSAFE_componentWillReceiveProps != 'function' &&
        typeof u.componentWillReceiveProps != 'function') ||
      ((i !== r || s !== c) && ji(t, u, r, c)),
      (qe = !1));
    var p = t.memoizedState;
    ((u.state = p),
      Yr(t, r, u, l),
      (s = t.memoizedState),
      i !== r || p !== s || de.current || qe
        ? (typeof m == 'function' && (To(t, n, m, r), (s = t.memoizedState)),
          (i = qe || Li(t, n, i, r, p, s, c))
            ? (h ||
                (typeof u.UNSAFE_componentWillMount != 'function' &&
                  typeof u.componentWillMount != 'function') ||
                (typeof u.componentWillMount == 'function' && u.componentWillMount(),
                typeof u.UNSAFE_componentWillMount == 'function' && u.UNSAFE_componentWillMount()),
              typeof u.componentDidMount == 'function' && (t.flags |= 4194308))
            : (typeof u.componentDidMount == 'function' && (t.flags |= 4194308),
              (t.memoizedProps = r),
              (t.memoizedState = s)),
          (u.props = r),
          (u.state = s),
          (u.context = c),
          (r = i))
        : (typeof u.componentDidMount == 'function' && (t.flags |= 4194308), (r = !1)));
  } else {
    ((u = t.stateNode),
      wa(e, t),
      (i = t.memoizedProps),
      (c = t.type === t.elementType ? i : Te(t.type, i)),
      (u.props = c),
      (h = t.pendingProps),
      (p = u.context),
      (s = n.contextType),
      typeof s == 'object' && s !== null
        ? (s = _e(s))
        : ((s = pe(n) ? _t : oe.current), (s = qt(t, s))));
    var g = n.getDerivedStateFromProps;
    ((m = typeof g == 'function' || typeof u.getSnapshotBeforeUpdate == 'function') ||
      (typeof u.UNSAFE_componentWillReceiveProps != 'function' &&
        typeof u.componentWillReceiveProps != 'function') ||
      ((i !== h || p !== s) && ji(t, u, r, s)),
      (qe = !1),
      (p = t.memoizedState),
      (u.state = p),
      Yr(t, r, u, l));
    var w = t.memoizedState;
    i !== h || p !== w || de.current || qe
      ? (typeof g == 'function' && (To(t, n, g, r), (w = t.memoizedState)),
        (c = qe || Li(t, n, c, r, p, w, s) || !1)
          ? (m ||
              (typeof u.UNSAFE_componentWillUpdate != 'function' &&
                typeof u.componentWillUpdate != 'function') ||
              (typeof u.componentWillUpdate == 'function' && u.componentWillUpdate(r, w, s),
              typeof u.UNSAFE_componentWillUpdate == 'function' &&
                u.UNSAFE_componentWillUpdate(r, w, s)),
            typeof u.componentDidUpdate == 'function' && (t.flags |= 4),
            typeof u.getSnapshotBeforeUpdate == 'function' && (t.flags |= 1024))
          : (typeof u.componentDidUpdate != 'function' ||
              (i === e.memoizedProps && p === e.memoizedState) ||
              (t.flags |= 4),
            typeof u.getSnapshotBeforeUpdate != 'function' ||
              (i === e.memoizedProps && p === e.memoizedState) ||
              (t.flags |= 1024),
            (t.memoizedProps = r),
            (t.memoizedState = w)),
        (u.props = r),
        (u.state = w),
        (u.context = s),
        (r = c))
      : (typeof u.componentDidUpdate != 'function' ||
          (i === e.memoizedProps && p === e.memoizedState) ||
          (t.flags |= 4),
        typeof u.getSnapshotBeforeUpdate != 'function' ||
          (i === e.memoizedProps && p === e.memoizedState) ||
          (t.flags |= 1024),
        (r = !1));
  }
  return Oo(e, t, n, r, o, l);
}
function Oo(e, t, n, r, l, o) {
  Qa(e, t);
  var u = (t.flags & 128) !== 0;
  if (!r && !u) return (l && xi(t, n, !1), Ye(e, t, o));
  ((r = t.stateNode), (Nd.current = t));
  var i = u && typeof n.getDerivedStateFromError != 'function' ? null : r.render();
  return (
    (t.flags |= 1),
    e !== null && u
      ? ((t.child = en(t, e.child, null, o)), (t.child = en(t, null, i, o)))
      : ue(e, t, i, o),
    (t.memoizedState = r.state),
    l && xi(t, n, !0),
    t.child
  );
}
function Ka(e) {
  var t = e.stateNode;
  (t.pendingContext
    ? ki(e, t.pendingContext, t.pendingContext !== t.context)
    : t.context && ki(e, t.context, !1),
    Su(e, t.containerInfo));
}
function Ai(e, t, n, r, l) {
  return (bt(), mu(l), (t.flags |= 256), ue(e, t, n, r), t.child);
}
var Do = { dehydrated: null, treeContext: null, retryLane: 0 };
function Mo(e) {
  return { baseLanes: e, cachePool: null, transitions: null };
}
function Ga(e, t, n) {
  var r = t.pendingProps,
    l = U.current,
    o = !1,
    u = (t.flags & 128) !== 0,
    i;
  if (
    ((i = u) || (i = e !== null && e.memoizedState === null ? !1 : (l & 2) !== 0),
    i ? ((o = !0), (t.flags &= -129)) : (e === null || e.memoizedState !== null) && (l |= 1),
    D(U, l & 1),
    e === null)
  )
    return (
      Po(t),
      (e = t.memoizedState),
      e !== null && ((e = e.dehydrated), e !== null)
        ? (t.mode & 1 ? (e.data === '$!' ? (t.lanes = 8) : (t.lanes = 1073741824)) : (t.lanes = 1),
          null)
        : ((u = r.children),
          (e = r.fallback),
          o
            ? ((r = t.mode),
              (o = t.child),
              (u = { mode: 'hidden', children: u }),
              !(r & 1) && o !== null
                ? ((o.childLanes = 0), (o.pendingProps = u))
                : (o = ml(u, r, 0, null)),
              (e = Ct(e, r, n, null)),
              (o.return = t),
              (e.return = t),
              (o.sibling = e),
              (t.child = o),
              (t.child.memoizedState = Mo(n)),
              (t.memoizedState = Do),
              e)
            : zu(t, u))
    );
  if (((l = e.memoizedState), l !== null && ((i = l.dehydrated), i !== null)))
    return Pd(e, t, u, r, i, l, n);
  if (o) {
    ((o = r.fallback), (u = t.mode), (l = e.child), (i = l.sibling));
    var s = { mode: 'hidden', children: r.children };
    return (
      !(u & 1) && t.child !== l
        ? ((r = t.child), (r.childLanes = 0), (r.pendingProps = s), (t.deletions = null))
        : ((r = ct(l, s)), (r.subtreeFlags = l.subtreeFlags & 14680064)),
      i !== null ? (o = ct(i, o)) : ((o = Ct(o, u, n, null)), (o.flags |= 2)),
      (o.return = t),
      (r.return = t),
      (r.sibling = o),
      (t.child = r),
      (r = o),
      (o = t.child),
      (u = e.child.memoizedState),
      (u =
        u === null
          ? Mo(n)
          : { baseLanes: u.baseLanes | n, cachePool: null, transitions: u.transitions }),
      (o.memoizedState = u),
      (o.childLanes = e.childLanes & ~n),
      (t.memoizedState = Do),
      r
    );
  }
  return (
    (o = e.child),
    (e = o.sibling),
    (r = ct(o, { mode: 'visible', children: r.children })),
    !(t.mode & 1) && (r.lanes = n),
    (r.return = t),
    (r.sibling = null),
    e !== null &&
      ((n = t.deletions), n === null ? ((t.deletions = [e]), (t.flags |= 16)) : n.push(e)),
    (t.child = r),
    (t.memoizedState = null),
    r
  );
}
function zu(e, t) {
  return (
    (t = ml({ mode: 'visible', children: t }, e.mode, 0, null)),
    (t.return = e),
    (e.child = t)
  );
}
function yr(e, t, n, r) {
  return (
    r !== null && mu(r),
    en(t, e.child, null, n),
    (e = zu(t, t.pendingProps.children)),
    (e.flags |= 2),
    (t.memoizedState = null),
    e
  );
}
function Pd(e, t, n, r, l, o, u) {
  if (n)
    return t.flags & 256
      ? ((t.flags &= -257), (r = Kl(Error(y(422)))), yr(e, t, u, r))
      : t.memoizedState !== null
        ? ((t.child = e.child), (t.flags |= 128), null)
        : ((o = r.fallback),
          (l = t.mode),
          (r = ml({ mode: 'visible', children: r.children }, l, 0, null)),
          (o = Ct(o, l, u, null)),
          (o.flags |= 2),
          (r.return = t),
          (o.return = t),
          (r.sibling = o),
          (t.child = r),
          t.mode & 1 && en(t, e.child, null, u),
          (t.child.memoizedState = Mo(u)),
          (t.memoizedState = Do),
          o);
  if (!(t.mode & 1)) return yr(e, t, u, null);
  if (l.data === '$!') {
    if (((r = l.nextSibling && l.nextSibling.dataset), r)) var i = r.dgst;
    return ((r = i), (o = Error(y(419))), (r = Kl(o, r, void 0)), yr(e, t, u, r));
  }
  if (((i = (u & e.childLanes) !== 0), fe || i)) {
    if (((r = q), r !== null)) {
      switch (u & -u) {
        case 4:
          l = 2;
          break;
        case 16:
          l = 8;
          break;
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
          l = 32;
          break;
        case 536870912:
          l = 268435456;
          break;
        default:
          l = 0;
      }
      ((l = l & (r.suspendedLanes | u) ? 0 : l),
        l !== 0 && l !== o.retryLane && ((o.retryLane = l), Ge(e, l), Oe(r, e, l, -1)));
    }
    return (Du(), (r = Kl(Error(y(421)))), yr(e, t, u, r));
  }
  return l.data === '$?'
    ? ((t.flags |= 128), (t.child = e.child), (t = Vd.bind(null, e)), (l._reactRetry = t), null)
    : ((e = o.treeContext),
      (ve = ut(l.nextSibling)),
      (ye = t),
      (A = !0),
      (je = null),
      e !== null &&
        ((ke[xe++] = Be),
        (ke[xe++] = We),
        (ke[xe++] = Nt),
        (Be = e.id),
        (We = e.overflow),
        (Nt = t)),
      (t = zu(t, r.children)),
      (t.flags |= 4096),
      t);
}
function Ui(e, t, n) {
  e.lanes |= t;
  var r = e.alternate;
  (r !== null && (r.lanes |= t), zo(e.return, t, n));
}
function Gl(e, t, n, r, l) {
  var o = e.memoizedState;
  o === null
    ? (e.memoizedState = {
        isBackwards: t,
        rendering: null,
        renderingStartTime: 0,
        last: r,
        tail: n,
        tailMode: l,
      })
    : ((o.isBackwards = t),
      (o.rendering = null),
      (o.renderingStartTime = 0),
      (o.last = r),
      (o.tail = n),
      (o.tailMode = l));
}
function Ya(e, t, n) {
  var r = t.pendingProps,
    l = r.revealOrder,
    o = r.tail;
  if ((ue(e, t, r.children, n), (r = U.current), r & 2)) ((r = (r & 1) | 2), (t.flags |= 128));
  else {
    if (e !== null && e.flags & 128)
      e: for (e = t.child; e !== null; ) {
        if (e.tag === 13) e.memoizedState !== null && Ui(e, n, t);
        else if (e.tag === 19) Ui(e, n, t);
        else if (e.child !== null) {
          ((e.child.return = e), (e = e.child));
          continue;
        }
        if (e === t) break e;
        for (; e.sibling === null; ) {
          if (e.return === null || e.return === t) break e;
          e = e.return;
        }
        ((e.sibling.return = e.return), (e = e.sibling));
      }
    r &= 1;
  }
  if ((D(U, r), !(t.mode & 1))) t.memoizedState = null;
  else
    switch (l) {
      case 'forwards':
        for (n = t.child, l = null; n !== null; )
          ((e = n.alternate), e !== null && Xr(e) === null && (l = n), (n = n.sibling));
        ((n = l),
          n === null ? ((l = t.child), (t.child = null)) : ((l = n.sibling), (n.sibling = null)),
          Gl(t, !1, l, n, o));
        break;
      case 'backwards':
        for (n = null, l = t.child, t.child = null; l !== null; ) {
          if (((e = l.alternate), e !== null && Xr(e) === null)) {
            t.child = l;
            break;
          }
          ((e = l.sibling), (l.sibling = n), (n = l), (l = e));
        }
        Gl(t, !0, n, null, o);
        break;
      case 'together':
        Gl(t, !1, null, null, void 0);
        break;
      default:
        t.memoizedState = null;
    }
  return t.child;
}
function Tr(e, t) {
  !(t.mode & 1) && e !== null && ((e.alternate = null), (t.alternate = null), (t.flags |= 2));
}
function Ye(e, t, n) {
  if ((e !== null && (t.dependencies = e.dependencies), (zt |= t.lanes), !(n & t.childLanes)))
    return null;
  if (e !== null && t.child !== e.child) throw Error(y(153));
  if (t.child !== null) {
    for (e = t.child, n = ct(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null; )
      ((e = e.sibling), (n = n.sibling = ct(e, e.pendingProps)), (n.return = t));
    n.sibling = null;
  }
  return t.child;
}
function zd(e, t, n) {
  switch (t.tag) {
    case 3:
      (Ka(t), bt());
      break;
    case 5:
      Sa(t);
      break;
    case 1:
      pe(t.type) && Wr(t);
      break;
    case 4:
      Su(t, t.stateNode.containerInfo);
      break;
    case 10:
      var r = t.type._context,
        l = t.memoizedProps.value;
      (D(Kr, r._currentValue), (r._currentValue = l));
      break;
    case 13:
      if (((r = t.memoizedState), r !== null))
        return r.dehydrated !== null
          ? (D(U, U.current & 1), (t.flags |= 128), null)
          : n & t.child.childLanes
            ? Ga(e, t, n)
            : (D(U, U.current & 1), (e = Ye(e, t, n)), e !== null ? e.sibling : null);
      D(U, U.current & 1);
      break;
    case 19:
      if (((r = (n & t.childLanes) !== 0), e.flags & 128)) {
        if (r) return Ya(e, t, n);
        t.flags |= 128;
      }
      if (
        ((l = t.memoizedState),
        l !== null && ((l.rendering = null), (l.tail = null), (l.lastEffect = null)),
        D(U, U.current),
        r)
      )
        break;
      return null;
    case 22:
    case 23:
      return ((t.lanes = 0), Ha(e, t, n));
  }
  return Ye(e, t, n);
}
var Xa, Io, Za, Ja;
Xa = function (e, t) {
  for (var n = t.child; n !== null; ) {
    if (n.tag === 5 || n.tag === 6) e.appendChild(n.stateNode);
    else if (n.tag !== 4 && n.child !== null) {
      ((n.child.return = n), (n = n.child));
      continue;
    }
    if (n === t) break;
    for (; n.sibling === null; ) {
      if (n.return === null || n.return === t) return;
      n = n.return;
    }
    ((n.sibling.return = n.return), (n = n.sibling));
  }
};
Io = function () {};
Za = function (e, t, n, r) {
  var l = e.memoizedProps;
  if (l !== r) {
    ((e = t.stateNode), xt(Ue.current));
    var o = null;
    switch (n) {
      case 'input':
        ((l = ro(e, l)), (r = ro(e, r)), (o = []));
        break;
      case 'select':
        ((l = $({}, l, { value: void 0 })), (r = $({}, r, { value: void 0 })), (o = []));
        break;
      case 'textarea':
        ((l = uo(e, l)), (r = uo(e, r)), (o = []));
        break;
      default:
        typeof l.onClick != 'function' && typeof r.onClick == 'function' && (e.onclick = $r);
    }
    so(n, r);
    var u;
    n = null;
    for (c in l)
      if (!r.hasOwnProperty(c) && l.hasOwnProperty(c) && l[c] != null)
        if (c === 'style') {
          var i = l[c];
          for (u in i) i.hasOwnProperty(u) && (n || (n = {}), (n[u] = ''));
        } else
          c !== 'dangerouslySetInnerHTML' &&
            c !== 'children' &&
            c !== 'suppressContentEditableWarning' &&
            c !== 'suppressHydrationWarning' &&
            c !== 'autoFocus' &&
            (Rn.hasOwnProperty(c) ? o || (o = []) : (o = o || []).push(c, null));
    for (c in r) {
      var s = r[c];
      if (
        ((i = l != null ? l[c] : void 0),
        r.hasOwnProperty(c) && s !== i && (s != null || i != null))
      )
        if (c === 'style')
          if (i) {
            for (u in i)
              !i.hasOwnProperty(u) || (s && s.hasOwnProperty(u)) || (n || (n = {}), (n[u] = ''));
            for (u in s) s.hasOwnProperty(u) && i[u] !== s[u] && (n || (n = {}), (n[u] = s[u]));
          } else (n || (o || (o = []), o.push(c, n)), (n = s));
        else
          c === 'dangerouslySetInnerHTML'
            ? ((s = s ? s.__html : void 0),
              (i = i ? i.__html : void 0),
              s != null && i !== s && (o = o || []).push(c, s))
            : c === 'children'
              ? (typeof s != 'string' && typeof s != 'number') || (o = o || []).push(c, '' + s)
              : c !== 'suppressContentEditableWarning' &&
                c !== 'suppressHydrationWarning' &&
                (Rn.hasOwnProperty(c)
                  ? (s != null && c === 'onScroll' && M('scroll', e), o || i === s || (o = []))
                  : (o = o || []).push(c, s));
    }
    n && (o = o || []).push('style', n);
    var c = o;
    (t.updateQueue = c) && (t.flags |= 4);
  }
};
Ja = function (e, t, n, r) {
  n !== r && (t.flags |= 4);
};
function yn(e, t) {
  if (!A)
    switch (e.tailMode) {
      case 'hidden':
        t = e.tail;
        for (var n = null; t !== null; ) (t.alternate !== null && (n = t), (t = t.sibling));
        n === null ? (e.tail = null) : (n.sibling = null);
        break;
      case 'collapsed':
        n = e.tail;
        for (var r = null; n !== null; ) (n.alternate !== null && (r = n), (n = n.sibling));
        r === null
          ? t || e.tail === null
            ? (e.tail = null)
            : (e.tail.sibling = null)
          : (r.sibling = null);
    }
}
function re(e) {
  var t = e.alternate !== null && e.alternate.child === e.child,
    n = 0,
    r = 0;
  if (t)
    for (var l = e.child; l !== null; )
      ((n |= l.lanes | l.childLanes),
        (r |= l.subtreeFlags & 14680064),
        (r |= l.flags & 14680064),
        (l.return = e),
        (l = l.sibling));
  else
    for (l = e.child; l !== null; )
      ((n |= l.lanes | l.childLanes),
        (r |= l.subtreeFlags),
        (r |= l.flags),
        (l.return = e),
        (l = l.sibling));
  return ((e.subtreeFlags |= r), (e.childLanes = n), t);
}
function Td(e, t, n) {
  var r = t.pendingProps;
  switch ((pu(t), t.tag)) {
    case 2:
    case 16:
    case 15:
    case 0:
    case 11:
    case 7:
    case 8:
    case 12:
    case 9:
    case 14:
      return (re(t), null);
    case 1:
      return (pe(t.type) && Br(), re(t), null);
    case 3:
      return (
        (r = t.stateNode),
        tn(),
        I(de),
        I(oe),
        xu(),
        r.pendingContext && ((r.context = r.pendingContext), (r.pendingContext = null)),
        (e === null || e.child === null) &&
          (hr(t)
            ? (t.flags |= 4)
            : e === null ||
              (e.memoizedState.isDehydrated && !(t.flags & 256)) ||
              ((t.flags |= 1024), je !== null && (Ho(je), (je = null)))),
        Io(e, t),
        re(t),
        null
      );
    case 5:
      ku(t);
      var l = xt(Hn.current);
      if (((n = t.type), e !== null && t.stateNode != null))
        (Za(e, t, n, r, l), e.ref !== t.ref && ((t.flags |= 512), (t.flags |= 2097152)));
      else {
        if (!r) {
          if (t.stateNode === null) throw Error(y(166));
          return (re(t), null);
        }
        if (((e = xt(Ue.current)), hr(t))) {
          ((r = t.stateNode), (n = t.type));
          var o = t.memoizedProps;
          switch (((r[Fe] = t), (r[Bn] = o), (e = (t.mode & 1) !== 0), n)) {
            case 'dialog':
              (M('cancel', r), M('close', r));
              break;
            case 'iframe':
            case 'object':
            case 'embed':
              M('load', r);
              break;
            case 'video':
            case 'audio':
              for (l = 0; l < xn.length; l++) M(xn[l], r);
              break;
            case 'source':
              M('error', r);
              break;
            case 'img':
            case 'image':
            case 'link':
              (M('error', r), M('load', r));
              break;
            case 'details':
              M('toggle', r);
              break;
            case 'input':
              (Yu(r, o), M('invalid', r));
              break;
            case 'select':
              ((r._wrapperState = { wasMultiple: !!o.multiple }), M('invalid', r));
              break;
            case 'textarea':
              (Zu(r, o), M('invalid', r));
          }
          (so(n, o), (l = null));
          for (var u in o)
            if (o.hasOwnProperty(u)) {
              var i = o[u];
              u === 'children'
                ? typeof i == 'string'
                  ? r.textContent !== i &&
                    (o.suppressHydrationWarning !== !0 && mr(r.textContent, i, e),
                    (l = ['children', i]))
                  : typeof i == 'number' &&
                    r.textContent !== '' + i &&
                    (o.suppressHydrationWarning !== !0 && mr(r.textContent, i, e),
                    (l = ['children', '' + i]))
                : Rn.hasOwnProperty(u) && i != null && u === 'onScroll' && M('scroll', r);
            }
          switch (n) {
            case 'input':
              (ur(r), Xu(r, o, !0));
              break;
            case 'textarea':
              (ur(r), Ju(r));
              break;
            case 'select':
            case 'option':
              break;
            default:
              typeof o.onClick == 'function' && (r.onclick = $r);
          }
          ((r = l), (t.updateQueue = r), r !== null && (t.flags |= 4));
        } else {
          ((u = l.nodeType === 9 ? l : l.ownerDocument),
            e === 'http://www.w3.org/1999/xhtml' && (e = _s(n)),
            e === 'http://www.w3.org/1999/xhtml'
              ? n === 'script'
                ? ((e = u.createElement('div')),
                  (e.innerHTML = '<script><\/script>'),
                  (e = e.removeChild(e.firstChild)))
                : typeof r.is == 'string'
                  ? (e = u.createElement(n, { is: r.is }))
                  : ((e = u.createElement(n)),
                    n === 'select' &&
                      ((u = e), r.multiple ? (u.multiple = !0) : r.size && (u.size = r.size)))
              : (e = u.createElementNS(e, n)),
            (e[Fe] = t),
            (e[Bn] = r),
            Xa(e, t, !1, !1),
            (t.stateNode = e));
          e: {
            switch (((u = ao(n, r)), n)) {
              case 'dialog':
                (M('cancel', e), M('close', e), (l = r));
                break;
              case 'iframe':
              case 'object':
              case 'embed':
                (M('load', e), (l = r));
                break;
              case 'video':
              case 'audio':
                for (l = 0; l < xn.length; l++) M(xn[l], e);
                l = r;
                break;
              case 'source':
                (M('error', e), (l = r));
                break;
              case 'img':
              case 'image':
              case 'link':
                (M('error', e), M('load', e), (l = r));
                break;
              case 'details':
                (M('toggle', e), (l = r));
                break;
              case 'input':
                (Yu(e, r), (l = ro(e, r)), M('invalid', e));
                break;
              case 'option':
                l = r;
                break;
              case 'select':
                ((e._wrapperState = { wasMultiple: !!r.multiple }),
                  (l = $({}, r, { value: void 0 })),
                  M('invalid', e));
                break;
              case 'textarea':
                (Zu(e, r), (l = uo(e, r)), M('invalid', e));
                break;
              default:
                l = r;
            }
            (so(n, l), (i = l));
            for (o in i)
              if (i.hasOwnProperty(o)) {
                var s = i[o];
                o === 'style'
                  ? zs(e, s)
                  : o === 'dangerouslySetInnerHTML'
                    ? ((s = s ? s.__html : void 0), s != null && Ns(e, s))
                    : o === 'children'
                      ? typeof s == 'string'
                        ? (n !== 'textarea' || s !== '') && On(e, s)
                        : typeof s == 'number' && On(e, '' + s)
                      : o !== 'suppressContentEditableWarning' &&
                        o !== 'suppressHydrationWarning' &&
                        o !== 'autoFocus' &&
                        (Rn.hasOwnProperty(o)
                          ? s != null && o === 'onScroll' && M('scroll', e)
                          : s != null && qo(e, o, s, u));
              }
            switch (n) {
              case 'input':
                (ur(e), Xu(e, r, !1));
                break;
              case 'textarea':
                (ur(e), Ju(e));
                break;
              case 'option':
                r.value != null && e.setAttribute('value', '' + ft(r.value));
                break;
              case 'select':
                ((e.multiple = !!r.multiple),
                  (o = r.value),
                  o != null
                    ? Qt(e, !!r.multiple, o, !1)
                    : r.defaultValue != null && Qt(e, !!r.multiple, r.defaultValue, !0));
                break;
              default:
                typeof l.onClick == 'function' && (e.onclick = $r);
            }
            switch (n) {
              case 'button':
              case 'input':
              case 'select':
              case 'textarea':
                r = !!r.autoFocus;
                break e;
              case 'img':
                r = !0;
                break e;
              default:
                r = !1;
            }
          }
          r && (t.flags |= 4);
        }
        t.ref !== null && ((t.flags |= 512), (t.flags |= 2097152));
      }
      return (re(t), null);
    case 6:
      if (e && t.stateNode != null) Ja(e, t, e.memoizedProps, r);
      else {
        if (typeof r != 'string' && t.stateNode === null) throw Error(y(166));
        if (((n = xt(Hn.current)), xt(Ue.current), hr(t))) {
          if (
            ((r = t.stateNode),
            (n = t.memoizedProps),
            (r[Fe] = t),
            (o = r.nodeValue !== n) && ((e = ye), e !== null))
          )
            switch (e.tag) {
              case 3:
                mr(r.nodeValue, n, (e.mode & 1) !== 0);
                break;
              case 5:
                e.memoizedProps.suppressHydrationWarning !== !0 &&
                  mr(r.nodeValue, n, (e.mode & 1) !== 0);
            }
          o && (t.flags |= 4);
        } else
          ((r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r)),
            (r[Fe] = t),
            (t.stateNode = r));
      }
      return (re(t), null);
    case 13:
      if (
        (I(U),
        (r = t.memoizedState),
        e === null || (e.memoizedState !== null && e.memoizedState.dehydrated !== null))
      ) {
        if (A && ve !== null && t.mode & 1 && !(t.flags & 128))
          (ha(), bt(), (t.flags |= 98560), (o = !1));
        else if (((o = hr(t)), r !== null && r.dehydrated !== null)) {
          if (e === null) {
            if (!o) throw Error(y(318));
            if (((o = t.memoizedState), (o = o !== null ? o.dehydrated : null), !o))
              throw Error(y(317));
            o[Fe] = t;
          } else (bt(), !(t.flags & 128) && (t.memoizedState = null), (t.flags |= 4));
          (re(t), (o = !1));
        } else (je !== null && (Ho(je), (je = null)), (o = !0));
        if (!o) return t.flags & 65536 ? t : null;
      }
      return t.flags & 128
        ? ((t.lanes = n), t)
        : ((r = r !== null),
          r !== (e !== null && e.memoizedState !== null) &&
            r &&
            ((t.child.flags |= 8192),
            t.mode & 1 && (e === null || U.current & 1 ? X === 0 && (X = 3) : Du())),
          t.updateQueue !== null && (t.flags |= 4),
          re(t),
          null);
    case 4:
      return (tn(), Io(e, t), e === null && Vn(t.stateNode.containerInfo), re(t), null);
    case 10:
      return (yu(t.type._context), re(t), null);
    case 17:
      return (pe(t.type) && Br(), re(t), null);
    case 19:
      if ((I(U), (o = t.memoizedState), o === null)) return (re(t), null);
      if (((r = (t.flags & 128) !== 0), (u = o.rendering), u === null))
        if (r) yn(o, !1);
        else {
          if (X !== 0 || (e !== null && e.flags & 128))
            for (e = t.child; e !== null; ) {
              if (((u = Xr(e)), u !== null)) {
                for (
                  t.flags |= 128,
                    yn(o, !1),
                    r = u.updateQueue,
                    r !== null && ((t.updateQueue = r), (t.flags |= 4)),
                    t.subtreeFlags = 0,
                    r = n,
                    n = t.child;
                  n !== null;
                )
                  ((o = n),
                    (e = r),
                    (o.flags &= 14680066),
                    (u = o.alternate),
                    u === null
                      ? ((o.childLanes = 0),
                        (o.lanes = e),
                        (o.child = null),
                        (o.subtreeFlags = 0),
                        (o.memoizedProps = null),
                        (o.memoizedState = null),
                        (o.updateQueue = null),
                        (o.dependencies = null),
                        (o.stateNode = null))
                      : ((o.childLanes = u.childLanes),
                        (o.lanes = u.lanes),
                        (o.child = u.child),
                        (o.subtreeFlags = 0),
                        (o.deletions = null),
                        (o.memoizedProps = u.memoizedProps),
                        (o.memoizedState = u.memoizedState),
                        (o.updateQueue = u.updateQueue),
                        (o.type = u.type),
                        (e = u.dependencies),
                        (o.dependencies =
                          e === null ? null : { lanes: e.lanes, firstContext: e.firstContext })),
                    (n = n.sibling));
                return (D(U, (U.current & 1) | 2), t.child);
              }
              e = e.sibling;
            }
          o.tail !== null &&
            Q() > rn &&
            ((t.flags |= 128), (r = !0), yn(o, !1), (t.lanes = 4194304));
        }
      else {
        if (!r)
          if (((e = Xr(u)), e !== null)) {
            if (
              ((t.flags |= 128),
              (r = !0),
              (n = e.updateQueue),
              n !== null && ((t.updateQueue = n), (t.flags |= 4)),
              yn(o, !0),
              o.tail === null && o.tailMode === 'hidden' && !u.alternate && !A)
            )
              return (re(t), null);
          } else
            2 * Q() - o.renderingStartTime > rn &&
              n !== 1073741824 &&
              ((t.flags |= 128), (r = !0), yn(o, !1), (t.lanes = 4194304));
        o.isBackwards
          ? ((u.sibling = t.child), (t.child = u))
          : ((n = o.last), n !== null ? (n.sibling = u) : (t.child = u), (o.last = u));
      }
      return o.tail !== null
        ? ((t = o.tail),
          (o.rendering = t),
          (o.tail = t.sibling),
          (o.renderingStartTime = Q()),
          (t.sibling = null),
          (n = U.current),
          D(U, r ? (n & 1) | 2 : n & 1),
          t)
        : (re(t), null);
    case 22:
    case 23:
      return (
        Ou(),
        (r = t.memoizedState !== null),
        e !== null && (e.memoizedState !== null) !== r && (t.flags |= 8192),
        r && t.mode & 1
          ? he & 1073741824 && (re(t), t.subtreeFlags & 6 && (t.flags |= 8192))
          : re(t),
        null
      );
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(y(156, t.tag));
}
function Ld(e, t) {
  switch ((pu(t), t.tag)) {
    case 1:
      return (
        pe(t.type) && Br(),
        (e = t.flags),
        e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
      );
    case 3:
      return (
        tn(),
        I(de),
        I(oe),
        xu(),
        (e = t.flags),
        e & 65536 && !(e & 128) ? ((t.flags = (e & -65537) | 128), t) : null
      );
    case 5:
      return (ku(t), null);
    case 13:
      if ((I(U), (e = t.memoizedState), e !== null && e.dehydrated !== null)) {
        if (t.alternate === null) throw Error(y(340));
        bt();
      }
      return ((e = t.flags), e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null);
    case 19:
      return (I(U), null);
    case 4:
      return (tn(), null);
    case 10:
      return (yu(t.type._context), null);
    case 22:
    case 23:
      return (Ou(), null);
    case 24:
      return null;
    default:
      return null;
  }
}
var gr = !1,
  le = !1,
  jd = typeof WeakSet == 'function' ? WeakSet : Set,
  k = null;
function Wt(e, t) {
  var n = e.ref;
  if (n !== null)
    if (typeof n == 'function')
      try {
        n(null);
      } catch (r) {
        B(e, t, r);
      }
    else n.current = null;
}
function Fo(e, t, n) {
  try {
    n();
  } catch (r) {
    B(e, t, r);
  }
}
var Vi = !1;
function Rd(e, t) {
  if (((So = Ar), (e = na()), fu(e))) {
    if ('selectionStart' in e) var n = { start: e.selectionStart, end: e.selectionEnd };
    else
      e: {
        n = ((n = e.ownerDocument) && n.defaultView) || window;
        var r = n.getSelection && n.getSelection();
        if (r && r.rangeCount !== 0) {
          n = r.anchorNode;
          var l = r.anchorOffset,
            o = r.focusNode;
          r = r.focusOffset;
          try {
            (n.nodeType, o.nodeType);
          } catch {
            n = null;
            break e;
          }
          var u = 0,
            i = -1,
            s = -1,
            c = 0,
            m = 0,
            h = e,
            p = null;
          t: for (;;) {
            for (
              var g;
              h !== n || (l !== 0 && h.nodeType !== 3) || (i = u + l),
                h !== o || (r !== 0 && h.nodeType !== 3) || (s = u + r),
                h.nodeType === 3 && (u += h.nodeValue.length),
                (g = h.firstChild) !== null;
            )
              ((p = h), (h = g));
            for (;;) {
              if (h === e) break t;
              if (
                (p === n && ++c === l && (i = u),
                p === o && ++m === r && (s = u),
                (g = h.nextSibling) !== null)
              )
                break;
              ((h = p), (p = h.parentNode));
            }
            h = g;
          }
          n = i === -1 || s === -1 ? null : { start: i, end: s };
        } else n = null;
      }
    n = n || { start: 0, end: 0 };
  } else n = null;
  for (ko = { focusedElem: e, selectionRange: n }, Ar = !1, k = t; k !== null; )
    if (((t = k), (e = t.child), (t.subtreeFlags & 1028) !== 0 && e !== null))
      ((e.return = t), (k = e));
    else
      for (; k !== null; ) {
        t = k;
        try {
          var w = t.alternate;
          if (t.flags & 1024)
            switch (t.tag) {
              case 0:
              case 11:
              case 15:
                break;
              case 1:
                if (w !== null) {
                  var S = w.memoizedProps,
                    F = w.memoizedState,
                    f = t.stateNode,
                    a = f.getSnapshotBeforeUpdate(t.elementType === t.type ? S : Te(t.type, S), F);
                  f.__reactInternalSnapshotBeforeUpdate = a;
                }
                break;
              case 3:
                var d = t.stateNode.containerInfo;
                d.nodeType === 1
                  ? (d.textContent = '')
                  : d.nodeType === 9 && d.documentElement && d.removeChild(d.documentElement);
                break;
              case 5:
              case 6:
              case 4:
              case 17:
                break;
              default:
                throw Error(y(163));
            }
        } catch (v) {
          B(t, t.return, v);
        }
        if (((e = t.sibling), e !== null)) {
          ((e.return = t.return), (k = e));
          break;
        }
        k = t.return;
      }
  return ((w = Vi), (Vi = !1), w);
}
function Tn(e, t, n) {
  var r = t.updateQueue;
  if (((r = r !== null ? r.lastEffect : null), r !== null)) {
    var l = (r = r.next);
    do {
      if ((l.tag & e) === e) {
        var o = l.destroy;
        ((l.destroy = void 0), o !== void 0 && Fo(t, n, o));
      }
      l = l.next;
    } while (l !== r);
  }
}
function dl(e, t) {
  if (((t = t.updateQueue), (t = t !== null ? t.lastEffect : null), t !== null)) {
    var n = (t = t.next);
    do {
      if ((n.tag & e) === e) {
        var r = n.create;
        n.destroy = r();
      }
      n = n.next;
    } while (n !== t);
  }
}
function Ao(e) {
  var t = e.ref;
  if (t !== null) {
    var n = e.stateNode;
    switch (e.tag) {
      case 5:
        e = n;
        break;
      default:
        e = n;
    }
    typeof t == 'function' ? t(e) : (t.current = e);
  }
}
function qa(e) {
  var t = e.alternate;
  (t !== null && ((e.alternate = null), qa(t)),
    (e.child = null),
    (e.deletions = null),
    (e.sibling = null),
    e.tag === 5 &&
      ((t = e.stateNode),
      t !== null && (delete t[Fe], delete t[Bn], delete t[Co], delete t[md], delete t[hd])),
    (e.stateNode = null),
    (e.return = null),
    (e.dependencies = null),
    (e.memoizedProps = null),
    (e.memoizedState = null),
    (e.pendingProps = null),
    (e.stateNode = null),
    (e.updateQueue = null));
}
function ba(e) {
  return e.tag === 5 || e.tag === 3 || e.tag === 4;
}
function $i(e) {
  e: for (;;) {
    for (; e.sibling === null; ) {
      if (e.return === null || ba(e.return)) return null;
      e = e.return;
    }
    for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18; ) {
      if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
      ((e.child.return = e), (e = e.child));
    }
    if (!(e.flags & 2)) return e.stateNode;
  }
}
function Uo(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6)
    ((e = e.stateNode),
      t
        ? n.nodeType === 8
          ? n.parentNode.insertBefore(e, t)
          : n.insertBefore(e, t)
        : (n.nodeType === 8
            ? ((t = n.parentNode), t.insertBefore(e, n))
            : ((t = n), t.appendChild(e)),
          (n = n._reactRootContainer),
          n != null || t.onclick !== null || (t.onclick = $r)));
  else if (r !== 4 && ((e = e.child), e !== null))
    for (Uo(e, t, n), e = e.sibling; e !== null; ) (Uo(e, t, n), (e = e.sibling));
}
function Vo(e, t, n) {
  var r = e.tag;
  if (r === 5 || r === 6) ((e = e.stateNode), t ? n.insertBefore(e, t) : n.appendChild(e));
  else if (r !== 4 && ((e = e.child), e !== null))
    for (Vo(e, t, n), e = e.sibling; e !== null; ) (Vo(e, t, n), (e = e.sibling));
}
var b = null,
  Le = !1;
function Ze(e, t, n) {
  for (n = n.child; n !== null; ) (ec(e, t, n), (n = n.sibling));
}
function ec(e, t, n) {
  if (Ae && typeof Ae.onCommitFiberUnmount == 'function')
    try {
      Ae.onCommitFiberUnmount(ll, n);
    } catch {}
  switch (n.tag) {
    case 5:
      le || Wt(n, t);
    case 6:
      var r = b,
        l = Le;
      ((b = null),
        Ze(e, t, n),
        (b = r),
        (Le = l),
        b !== null &&
          (Le
            ? ((e = b),
              (n = n.stateNode),
              e.nodeType === 8 ? e.parentNode.removeChild(n) : e.removeChild(n))
            : b.removeChild(n.stateNode)));
      break;
    case 18:
      b !== null &&
        (Le
          ? ((e = b),
            (n = n.stateNode),
            e.nodeType === 8 ? Vl(e.parentNode, n) : e.nodeType === 1 && Vl(e, n),
            Fn(e))
          : Vl(b, n.stateNode));
      break;
    case 4:
      ((r = b),
        (l = Le),
        (b = n.stateNode.containerInfo),
        (Le = !0),
        Ze(e, t, n),
        (b = r),
        (Le = l));
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!le && ((r = n.updateQueue), r !== null && ((r = r.lastEffect), r !== null))) {
        l = r = r.next;
        do {
          var o = l,
            u = o.destroy;
          ((o = o.tag), u !== void 0 && (o & 2 || o & 4) && Fo(n, t, u), (l = l.next));
        } while (l !== r);
      }
      Ze(e, t, n);
      break;
    case 1:
      if (!le && (Wt(n, t), (r = n.stateNode), typeof r.componentWillUnmount == 'function'))
        try {
          ((r.props = n.memoizedProps), (r.state = n.memoizedState), r.componentWillUnmount());
        } catch (i) {
          B(n, t, i);
        }
      Ze(e, t, n);
      break;
    case 21:
      Ze(e, t, n);
      break;
    case 22:
      n.mode & 1
        ? ((le = (r = le) || n.memoizedState !== null), Ze(e, t, n), (le = r))
        : Ze(e, t, n);
      break;
    default:
      Ze(e, t, n);
  }
}
function Bi(e) {
  var t = e.updateQueue;
  if (t !== null) {
    e.updateQueue = null;
    var n = e.stateNode;
    (n === null && (n = e.stateNode = new jd()),
      t.forEach(function (r) {
        var l = $d.bind(null, e, r);
        n.has(r) || (n.add(r), r.then(l, l));
      }));
  }
}
function ze(e, t) {
  var n = t.deletions;
  if (n !== null)
    for (var r = 0; r < n.length; r++) {
      var l = n[r];
      try {
        var o = e,
          u = t,
          i = u;
        e: for (; i !== null; ) {
          switch (i.tag) {
            case 5:
              ((b = i.stateNode), (Le = !1));
              break e;
            case 3:
              ((b = i.stateNode.containerInfo), (Le = !0));
              break e;
            case 4:
              ((b = i.stateNode.containerInfo), (Le = !0));
              break e;
          }
          i = i.return;
        }
        if (b === null) throw Error(y(160));
        (ec(o, u, l), (b = null), (Le = !1));
        var s = l.alternate;
        (s !== null && (s.return = null), (l.return = null));
      } catch (c) {
        B(l, t, c);
      }
    }
  if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) (tc(t, e), (t = t.sibling));
}
function tc(e, t) {
  var n = e.alternate,
    r = e.flags;
  switch (e.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if ((ze(t, e), Me(e), r & 4)) {
        try {
          (Tn(3, e, e.return), dl(3, e));
        } catch (S) {
          B(e, e.return, S);
        }
        try {
          Tn(5, e, e.return);
        } catch (S) {
          B(e, e.return, S);
        }
      }
      break;
    case 1:
      (ze(t, e), Me(e), r & 512 && n !== null && Wt(n, n.return));
      break;
    case 5:
      if ((ze(t, e), Me(e), r & 512 && n !== null && Wt(n, n.return), e.flags & 32)) {
        var l = e.stateNode;
        try {
          On(l, '');
        } catch (S) {
          B(e, e.return, S);
        }
      }
      if (r & 4 && ((l = e.stateNode), l != null)) {
        var o = e.memoizedProps,
          u = n !== null ? n.memoizedProps : o,
          i = e.type,
          s = e.updateQueue;
        if (((e.updateQueue = null), s !== null))
          try {
            (i === 'input' && o.type === 'radio' && o.name != null && Es(l, o), ao(i, u));
            var c = ao(i, o);
            for (u = 0; u < s.length; u += 2) {
              var m = s[u],
                h = s[u + 1];
              m === 'style'
                ? zs(l, h)
                : m === 'dangerouslySetInnerHTML'
                  ? Ns(l, h)
                  : m === 'children'
                    ? On(l, h)
                    : qo(l, m, h, c);
            }
            switch (i) {
              case 'input':
                lo(l, o);
                break;
              case 'textarea':
                Cs(l, o);
                break;
              case 'select':
                var p = l._wrapperState.wasMultiple;
                l._wrapperState.wasMultiple = !!o.multiple;
                var g = o.value;
                g != null
                  ? Qt(l, !!o.multiple, g, !1)
                  : p !== !!o.multiple &&
                    (o.defaultValue != null
                      ? Qt(l, !!o.multiple, o.defaultValue, !0)
                      : Qt(l, !!o.multiple, o.multiple ? [] : '', !1));
            }
            l[Bn] = o;
          } catch (S) {
            B(e, e.return, S);
          }
      }
      break;
    case 6:
      if ((ze(t, e), Me(e), r & 4)) {
        if (e.stateNode === null) throw Error(y(162));
        ((l = e.stateNode), (o = e.memoizedProps));
        try {
          l.nodeValue = o;
        } catch (S) {
          B(e, e.return, S);
        }
      }
      break;
    case 3:
      if ((ze(t, e), Me(e), r & 4 && n !== null && n.memoizedState.isDehydrated))
        try {
          Fn(t.containerInfo);
        } catch (S) {
          B(e, e.return, S);
        }
      break;
    case 4:
      (ze(t, e), Me(e));
      break;
    case 13:
      (ze(t, e),
        Me(e),
        (l = e.child),
        l.flags & 8192 &&
          ((o = l.memoizedState !== null),
          (l.stateNode.isHidden = o),
          !o || (l.alternate !== null && l.alternate.memoizedState !== null) || (ju = Q())),
        r & 4 && Bi(e));
      break;
    case 22:
      if (
        ((m = n !== null && n.memoizedState !== null),
        e.mode & 1 ? ((le = (c = le) || m), ze(t, e), (le = c)) : ze(t, e),
        Me(e),
        r & 8192)
      ) {
        if (((c = e.memoizedState !== null), (e.stateNode.isHidden = c) && !m && e.mode & 1))
          for (k = e, m = e.child; m !== null; ) {
            for (h = k = m; k !== null; ) {
              switch (((p = k), (g = p.child), p.tag)) {
                case 0:
                case 11:
                case 14:
                case 15:
                  Tn(4, p, p.return);
                  break;
                case 1:
                  Wt(p, p.return);
                  var w = p.stateNode;
                  if (typeof w.componentWillUnmount == 'function') {
                    ((r = p), (n = p.return));
                    try {
                      ((t = r),
                        (w.props = t.memoizedProps),
                        (w.state = t.memoizedState),
                        w.componentWillUnmount());
                    } catch (S) {
                      B(r, n, S);
                    }
                  }
                  break;
                case 5:
                  Wt(p, p.return);
                  break;
                case 22:
                  if (p.memoizedState !== null) {
                    Hi(h);
                    continue;
                  }
              }
              g !== null ? ((g.return = p), (k = g)) : Hi(h);
            }
            m = m.sibling;
          }
        e: for (m = null, h = e; ; ) {
          if (h.tag === 5) {
            if (m === null) {
              m = h;
              try {
                ((l = h.stateNode),
                  c
                    ? ((o = l.style),
                      typeof o.setProperty == 'function'
                        ? o.setProperty('display', 'none', 'important')
                        : (o.display = 'none'))
                    : ((i = h.stateNode),
                      (s = h.memoizedProps.style),
                      (u = s != null && s.hasOwnProperty('display') ? s.display : null),
                      (i.style.display = Ps('display', u))));
              } catch (S) {
                B(e, e.return, S);
              }
            }
          } else if (h.tag === 6) {
            if (m === null)
              try {
                h.stateNode.nodeValue = c ? '' : h.memoizedProps;
              } catch (S) {
                B(e, e.return, S);
              }
          } else if (
            ((h.tag !== 22 && h.tag !== 23) || h.memoizedState === null || h === e) &&
            h.child !== null
          ) {
            ((h.child.return = h), (h = h.child));
            continue;
          }
          if (h === e) break e;
          for (; h.sibling === null; ) {
            if (h.return === null || h.return === e) break e;
            (m === h && (m = null), (h = h.return));
          }
          (m === h && (m = null), (h.sibling.return = h.return), (h = h.sibling));
        }
      }
      break;
    case 19:
      (ze(t, e), Me(e), r & 4 && Bi(e));
      break;
    case 21:
      break;
    default:
      (ze(t, e), Me(e));
  }
}
function Me(e) {
  var t = e.flags;
  if (t & 2) {
    try {
      e: {
        for (var n = e.return; n !== null; ) {
          if (ba(n)) {
            var r = n;
            break e;
          }
          n = n.return;
        }
        throw Error(y(160));
      }
      switch (r.tag) {
        case 5:
          var l = r.stateNode;
          r.flags & 32 && (On(l, ''), (r.flags &= -33));
          var o = $i(e);
          Vo(e, o, l);
          break;
        case 3:
        case 4:
          var u = r.stateNode.containerInfo,
            i = $i(e);
          Uo(e, i, u);
          break;
        default:
          throw Error(y(161));
      }
    } catch (s) {
      B(e, e.return, s);
    }
    e.flags &= -3;
  }
  t & 4096 && (e.flags &= -4097);
}
function Od(e, t, n) {
  ((k = e), nc(e));
}
function nc(e, t, n) {
  for (var r = (e.mode & 1) !== 0; k !== null; ) {
    var l = k,
      o = l.child;
    if (l.tag === 22 && r) {
      var u = l.memoizedState !== null || gr;
      if (!u) {
        var i = l.alternate,
          s = (i !== null && i.memoizedState !== null) || le;
        i = gr;
        var c = le;
        if (((gr = u), (le = s) && !c))
          for (k = l; k !== null; )
            ((u = k),
              (s = u.child),
              u.tag === 22 && u.memoizedState !== null
                ? Qi(l)
                : s !== null
                  ? ((s.return = u), (k = s))
                  : Qi(l));
        for (; o !== null; ) ((k = o), nc(o), (o = o.sibling));
        ((k = l), (gr = i), (le = c));
      }
      Wi(e);
    } else l.subtreeFlags & 8772 && o !== null ? ((o.return = l), (k = o)) : Wi(e);
  }
}
function Wi(e) {
  for (; k !== null; ) {
    var t = k;
    if (t.flags & 8772) {
      var n = t.alternate;
      try {
        if (t.flags & 8772)
          switch (t.tag) {
            case 0:
            case 11:
            case 15:
              le || dl(5, t);
              break;
            case 1:
              var r = t.stateNode;
              if (t.flags & 4 && !le)
                if (n === null) r.componentDidMount();
                else {
                  var l = t.elementType === t.type ? n.memoizedProps : Te(t.type, n.memoizedProps);
                  r.componentDidUpdate(l, n.memoizedState, r.__reactInternalSnapshotBeforeUpdate);
                }
              var o = t.updateQueue;
              o !== null && Pi(t, o, r);
              break;
            case 3:
              var u = t.updateQueue;
              if (u !== null) {
                if (((n = null), t.child !== null))
                  switch (t.child.tag) {
                    case 5:
                      n = t.child.stateNode;
                      break;
                    case 1:
                      n = t.child.stateNode;
                  }
                Pi(t, u, n);
              }
              break;
            case 5:
              var i = t.stateNode;
              if (n === null && t.flags & 4) {
                n = i;
                var s = t.memoizedProps;
                switch (t.type) {
                  case 'button':
                  case 'input':
                  case 'select':
                  case 'textarea':
                    s.autoFocus && n.focus();
                    break;
                  case 'img':
                    s.src && (n.src = s.src);
                }
              }
              break;
            case 6:
              break;
            case 4:
              break;
            case 12:
              break;
            case 13:
              if (t.memoizedState === null) {
                var c = t.alternate;
                if (c !== null) {
                  var m = c.memoizedState;
                  if (m !== null) {
                    var h = m.dehydrated;
                    h !== null && Fn(h);
                  }
                }
              }
              break;
            case 19:
            case 17:
            case 21:
            case 22:
            case 23:
            case 25:
              break;
            default:
              throw Error(y(163));
          }
        le || (t.flags & 512 && Ao(t));
      } catch (p) {
        B(t, t.return, p);
      }
    }
    if (t === e) {
      k = null;
      break;
    }
    if (((n = t.sibling), n !== null)) {
      ((n.return = t.return), (k = n));
      break;
    }
    k = t.return;
  }
}
function Hi(e) {
  for (; k !== null; ) {
    var t = k;
    if (t === e) {
      k = null;
      break;
    }
    var n = t.sibling;
    if (n !== null) {
      ((n.return = t.return), (k = n));
      break;
    }
    k = t.return;
  }
}
function Qi(e) {
  for (; k !== null; ) {
    var t = k;
    try {
      switch (t.tag) {
        case 0:
        case 11:
        case 15:
          var n = t.return;
          try {
            dl(4, t);
          } catch (s) {
            B(t, n, s);
          }
          break;
        case 1:
          var r = t.stateNode;
          if (typeof r.componentDidMount == 'function') {
            var l = t.return;
            try {
              r.componentDidMount();
            } catch (s) {
              B(t, l, s);
            }
          }
          var o = t.return;
          try {
            Ao(t);
          } catch (s) {
            B(t, o, s);
          }
          break;
        case 5:
          var u = t.return;
          try {
            Ao(t);
          } catch (s) {
            B(t, u, s);
          }
      }
    } catch (s) {
      B(t, t.return, s);
    }
    if (t === e) {
      k = null;
      break;
    }
    var i = t.sibling;
    if (i !== null) {
      ((i.return = t.return), (k = i));
      break;
    }
    k = t.return;
  }
}
var Dd = Math.ceil,
  qr = Xe.ReactCurrentDispatcher,
  Tu = Xe.ReactCurrentOwner,
  Ce = Xe.ReactCurrentBatchConfig,
  R = 0,
  q = null,
  G = null,
  ee = 0,
  he = 0,
  Ht = mt(0),
  X = 0,
  Yn = null,
  zt = 0,
  pl = 0,
  Lu = 0,
  Ln = null,
  ce = null,
  ju = 0,
  rn = 1 / 0,
  Ve = null,
  br = !1,
  $o = null,
  st = null,
  wr = !1,
  nt = null,
  el = 0,
  jn = 0,
  Bo = null,
  Lr = -1,
  jr = 0;
function ie() {
  return R & 6 ? Q() : Lr !== -1 ? Lr : (Lr = Q());
}
function at(e) {
  return e.mode & 1
    ? R & 2 && ee !== 0
      ? ee & -ee
      : yd.transition !== null
        ? (jr === 0 && (jr = Vs()), jr)
        : ((e = O), e !== 0 || ((e = window.event), (e = e === void 0 ? 16 : Gs(e.type))), e)
    : 1;
}
function Oe(e, t, n, r) {
  if (50 < jn) throw ((jn = 0), (Bo = null), Error(y(185)));
  (Jn(e, n, r),
    (!(R & 2) || e !== q) &&
      (e === q && (!(R & 2) && (pl |= n), X === 4 && et(e, ee)),
      me(e, r),
      n === 1 && R === 0 && !(t.mode & 1) && ((rn = Q() + 500), al && ht())));
}
function me(e, t) {
  var n = e.callbackNode;
  yf(e, t);
  var r = Fr(e, e === q ? ee : 0);
  if (r === 0) (n !== null && ei(n), (e.callbackNode = null), (e.callbackPriority = 0));
  else if (((t = r & -r), e.callbackPriority !== t)) {
    if ((n != null && ei(n), t === 1))
      (e.tag === 0 ? vd(Ki.bind(null, e)) : da(Ki.bind(null, e)),
        dd(function () {
          !(R & 6) && ht();
        }),
        (n = null));
    else {
      switch ($s(r)) {
        case 1:
          n = ru;
          break;
        case 4:
          n = As;
          break;
        case 16:
          n = Ir;
          break;
        case 536870912:
          n = Us;
          break;
        default:
          n = Ir;
      }
      n = cc(n, rc.bind(null, e));
    }
    ((e.callbackPriority = t), (e.callbackNode = n));
  }
}
function rc(e, t) {
  if (((Lr = -1), (jr = 0), R & 6)) throw Error(y(327));
  var n = e.callbackNode;
  if (Zt() && e.callbackNode !== n) return null;
  var r = Fr(e, e === q ? ee : 0);
  if (r === 0) return null;
  if (r & 30 || r & e.expiredLanes || t) t = tl(e, r);
  else {
    t = r;
    var l = R;
    R |= 2;
    var o = oc();
    (q !== e || ee !== t) && ((Ve = null), (rn = Q() + 500), Et(e, t));
    do
      try {
        Fd();
        break;
      } catch (i) {
        lc(e, i);
      }
    while (!0);
    (vu(), (qr.current = o), (R = l), G !== null ? (t = 0) : ((q = null), (ee = 0), (t = X)));
  }
  if (t !== 0) {
    if ((t === 2 && ((l = ho(e)), l !== 0 && ((r = l), (t = Wo(e, l)))), t === 1))
      throw ((n = Yn), Et(e, 0), et(e, r), me(e, Q()), n);
    if (t === 6) et(e, r);
    else {
      if (
        ((l = e.current.alternate),
        !(r & 30) &&
          !Md(l) &&
          ((t = tl(e, r)), t === 2 && ((o = ho(e)), o !== 0 && ((r = o), (t = Wo(e, o)))), t === 1))
      )
        throw ((n = Yn), Et(e, 0), et(e, r), me(e, Q()), n);
      switch (((e.finishedWork = l), (e.finishedLanes = r), t)) {
        case 0:
        case 1:
          throw Error(y(345));
        case 2:
          wt(e, ce, Ve);
          break;
        case 3:
          if ((et(e, r), (r & 130023424) === r && ((t = ju + 500 - Q()), 10 < t))) {
            if (Fr(e, 0) !== 0) break;
            if (((l = e.suspendedLanes), (l & r) !== r)) {
              (ie(), (e.pingedLanes |= e.suspendedLanes & l));
              break;
            }
            e.timeoutHandle = Eo(wt.bind(null, e, ce, Ve), t);
            break;
          }
          wt(e, ce, Ve);
          break;
        case 4:
          if ((et(e, r), (r & 4194240) === r)) break;
          for (t = e.eventTimes, l = -1; 0 < r; ) {
            var u = 31 - Re(r);
            ((o = 1 << u), (u = t[u]), u > l && (l = u), (r &= ~o));
          }
          if (
            ((r = l),
            (r = Q() - r),
            (r =
              (120 > r
                ? 120
                : 480 > r
                  ? 480
                  : 1080 > r
                    ? 1080
                    : 1920 > r
                      ? 1920
                      : 3e3 > r
                        ? 3e3
                        : 4320 > r
                          ? 4320
                          : 1960 * Dd(r / 1960)) - r),
            10 < r)
          ) {
            e.timeoutHandle = Eo(wt.bind(null, e, ce, Ve), r);
            break;
          }
          wt(e, ce, Ve);
          break;
        case 5:
          wt(e, ce, Ve);
          break;
        default:
          throw Error(y(329));
      }
    }
  }
  return (me(e, Q()), e.callbackNode === n ? rc.bind(null, e) : null);
}
function Wo(e, t) {
  var n = Ln;
  return (
    e.current.memoizedState.isDehydrated && (Et(e, t).flags |= 256),
    (e = tl(e, t)),
    e !== 2 && ((t = ce), (ce = n), t !== null && Ho(t)),
    e
  );
}
function Ho(e) {
  ce === null ? (ce = e) : ce.push.apply(ce, e);
}
function Md(e) {
  for (var t = e; ; ) {
    if (t.flags & 16384) {
      var n = t.updateQueue;
      if (n !== null && ((n = n.stores), n !== null))
        for (var r = 0; r < n.length; r++) {
          var l = n[r],
            o = l.getSnapshot;
          l = l.value;
          try {
            if (!De(o(), l)) return !1;
          } catch {
            return !1;
          }
        }
    }
    if (((n = t.child), t.subtreeFlags & 16384 && n !== null)) ((n.return = t), (t = n));
    else {
      if (t === e) break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === e) return !0;
        t = t.return;
      }
      ((t.sibling.return = t.return), (t = t.sibling));
    }
  }
  return !0;
}
function et(e, t) {
  for (
    t &= ~Lu, t &= ~pl, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes;
    0 < t;
  ) {
    var n = 31 - Re(t),
      r = 1 << n;
    ((e[n] = -1), (t &= ~r));
  }
}
function Ki(e) {
  if (R & 6) throw Error(y(327));
  Zt();
  var t = Fr(e, 0);
  if (!(t & 1)) return (me(e, Q()), null);
  var n = tl(e, t);
  if (e.tag !== 0 && n === 2) {
    var r = ho(e);
    r !== 0 && ((t = r), (n = Wo(e, r)));
  }
  if (n === 1) throw ((n = Yn), Et(e, 0), et(e, t), me(e, Q()), n);
  if (n === 6) throw Error(y(345));
  return (
    (e.finishedWork = e.current.alternate),
    (e.finishedLanes = t),
    wt(e, ce, Ve),
    me(e, Q()),
    null
  );
}
function Ru(e, t) {
  var n = R;
  R |= 1;
  try {
    return e(t);
  } finally {
    ((R = n), R === 0 && ((rn = Q() + 500), al && ht()));
  }
}
function Tt(e) {
  nt !== null && nt.tag === 0 && !(R & 6) && Zt();
  var t = R;
  R |= 1;
  var n = Ce.transition,
    r = O;
  try {
    if (((Ce.transition = null), (O = 1), e)) return e();
  } finally {
    ((O = r), (Ce.transition = n), (R = t), !(R & 6) && ht());
  }
}
function Ou() {
  ((he = Ht.current), I(Ht));
}
function Et(e, t) {
  ((e.finishedWork = null), (e.finishedLanes = 0));
  var n = e.timeoutHandle;
  if ((n !== -1 && ((e.timeoutHandle = -1), fd(n)), G !== null))
    for (n = G.return; n !== null; ) {
      var r = n;
      switch ((pu(r), r.tag)) {
        case 1:
          ((r = r.type.childContextTypes), r != null && Br());
          break;
        case 3:
          (tn(), I(de), I(oe), xu());
          break;
        case 5:
          ku(r);
          break;
        case 4:
          tn();
          break;
        case 13:
          I(U);
          break;
        case 19:
          I(U);
          break;
        case 10:
          yu(r.type._context);
          break;
        case 22:
        case 23:
          Ou();
      }
      n = n.return;
    }
  if (
    ((q = e),
    (G = e = ct(e.current, null)),
    (ee = he = t),
    (X = 0),
    (Yn = null),
    (Lu = pl = zt = 0),
    (ce = Ln = null),
    kt !== null)
  ) {
    for (t = 0; t < kt.length; t++)
      if (((n = kt[t]), (r = n.interleaved), r !== null)) {
        n.interleaved = null;
        var l = r.next,
          o = n.pending;
        if (o !== null) {
          var u = o.next;
          ((o.next = l), (r.next = u));
        }
        n.pending = r;
      }
    kt = null;
  }
  return e;
}
function lc(e, t) {
  do {
    var n = G;
    try {
      if ((vu(), (Pr.current = Jr), Zr)) {
        for (var r = V.memoizedState; r !== null; ) {
          var l = r.queue;
          (l !== null && (l.pending = null), (r = r.next));
        }
        Zr = !1;
      }
      if (
        ((Pt = 0),
        (J = Y = V = null),
        (zn = !1),
        (Qn = 0),
        (Tu.current = null),
        n === null || n.return === null)
      ) {
        ((X = 1), (Yn = t), (G = null));
        break;
      }
      e: {
        var o = e,
          u = n.return,
          i = n,
          s = t;
        if (
          ((t = ee),
          (i.flags |= 32768),
          s !== null && typeof s == 'object' && typeof s.then == 'function')
        ) {
          var c = s,
            m = i,
            h = m.tag;
          if (!(m.mode & 1) && (h === 0 || h === 11 || h === 15)) {
            var p = m.alternate;
            p
              ? ((m.updateQueue = p.updateQueue),
                (m.memoizedState = p.memoizedState),
                (m.lanes = p.lanes))
              : ((m.updateQueue = null), (m.memoizedState = null));
          }
          var g = Oi(u);
          if (g !== null) {
            ((g.flags &= -257), Di(g, u, i, o, t), g.mode & 1 && Ri(o, c, t), (t = g), (s = c));
            var w = t.updateQueue;
            if (w === null) {
              var S = new Set();
              (S.add(s), (t.updateQueue = S));
            } else w.add(s);
            break e;
          } else {
            if (!(t & 1)) {
              (Ri(o, c, t), Du());
              break e;
            }
            s = Error(y(426));
          }
        } else if (A && i.mode & 1) {
          var F = Oi(u);
          if (F !== null) {
            (!(F.flags & 65536) && (F.flags |= 256), Di(F, u, i, o, t), mu(nn(s, i)));
            break e;
          }
        }
        ((o = s = nn(s, i)), X !== 4 && (X = 2), Ln === null ? (Ln = [o]) : Ln.push(o), (o = u));
        do {
          switch (o.tag) {
            case 3:
              ((o.flags |= 65536), (t &= -t), (o.lanes |= t));
              var f = $a(o, s, t);
              Ni(o, f);
              break e;
            case 1:
              i = s;
              var a = o.type,
                d = o.stateNode;
              if (
                !(o.flags & 128) &&
                (typeof a.getDerivedStateFromError == 'function' ||
                  (d !== null &&
                    typeof d.componentDidCatch == 'function' &&
                    (st === null || !st.has(d))))
              ) {
                ((o.flags |= 65536), (t &= -t), (o.lanes |= t));
                var v = Ba(o, i, t);
                Ni(o, v);
                break e;
              }
          }
          o = o.return;
        } while (o !== null);
      }
      ic(n);
    } catch (x) {
      ((t = x), G === n && n !== null && (G = n = n.return));
      continue;
    }
    break;
  } while (!0);
}
function oc() {
  var e = qr.current;
  return ((qr.current = Jr), e === null ? Jr : e);
}
function Du() {
  ((X === 0 || X === 3 || X === 2) && (X = 4),
    q === null || (!(zt & 268435455) && !(pl & 268435455)) || et(q, ee));
}
function tl(e, t) {
  var n = R;
  R |= 2;
  var r = oc();
  (q !== e || ee !== t) && ((Ve = null), Et(e, t));
  do
    try {
      Id();
      break;
    } catch (l) {
      lc(e, l);
    }
  while (!0);
  if ((vu(), (R = n), (qr.current = r), G !== null)) throw Error(y(261));
  return ((q = null), (ee = 0), X);
}
function Id() {
  for (; G !== null; ) uc(G);
}
function Fd() {
  for (; G !== null && !sf(); ) uc(G);
}
function uc(e) {
  var t = ac(e.alternate, e, he);
  ((e.memoizedProps = e.pendingProps), t === null ? ic(e) : (G = t), (Tu.current = null));
}
function ic(e) {
  var t = e;
  do {
    var n = t.alternate;
    if (((e = t.return), t.flags & 32768)) {
      if (((n = Ld(n, t)), n !== null)) {
        ((n.flags &= 32767), (G = n));
        return;
      }
      if (e !== null) ((e.flags |= 32768), (e.subtreeFlags = 0), (e.deletions = null));
      else {
        ((X = 6), (G = null));
        return;
      }
    } else if (((n = Td(n, t, he)), n !== null)) {
      G = n;
      return;
    }
    if (((t = t.sibling), t !== null)) {
      G = t;
      return;
    }
    G = t = e;
  } while (t !== null);
  X === 0 && (X = 5);
}
function wt(e, t, n) {
  var r = O,
    l = Ce.transition;
  try {
    ((Ce.transition = null), (O = 1), Ad(e, t, n, r));
  } finally {
    ((Ce.transition = l), (O = r));
  }
  return null;
}
function Ad(e, t, n, r) {
  do Zt();
  while (nt !== null);
  if (R & 6) throw Error(y(327));
  n = e.finishedWork;
  var l = e.finishedLanes;
  if (n === null) return null;
  if (((e.finishedWork = null), (e.finishedLanes = 0), n === e.current)) throw Error(y(177));
  ((e.callbackNode = null), (e.callbackPriority = 0));
  var o = n.lanes | n.childLanes;
  if (
    (gf(e, o),
    e === q && ((G = q = null), (ee = 0)),
    (!(n.subtreeFlags & 2064) && !(n.flags & 2064)) ||
      wr ||
      ((wr = !0),
      cc(Ir, function () {
        return (Zt(), null);
      })),
    (o = (n.flags & 15990) !== 0),
    n.subtreeFlags & 15990 || o)
  ) {
    ((o = Ce.transition), (Ce.transition = null));
    var u = O;
    O = 1;
    var i = R;
    ((R |= 4),
      (Tu.current = null),
      Rd(e, n),
      tc(n, e),
      ld(ko),
      (Ar = !!So),
      (ko = So = null),
      (e.current = n),
      Od(n),
      af(),
      (R = i),
      (O = u),
      (Ce.transition = o));
  } else e.current = n;
  if (
    (wr && ((wr = !1), (nt = e), (el = l)),
    (o = e.pendingLanes),
    o === 0 && (st = null),
    df(n.stateNode),
    me(e, Q()),
    t !== null)
  )
    for (r = e.onRecoverableError, n = 0; n < t.length; n++)
      ((l = t[n]), r(l.value, { componentStack: l.stack, digest: l.digest }));
  if (br) throw ((br = !1), (e = $o), ($o = null), e);
  return (
    el & 1 && e.tag !== 0 && Zt(),
    (o = e.pendingLanes),
    o & 1 ? (e === Bo ? jn++ : ((jn = 0), (Bo = e))) : (jn = 0),
    ht(),
    null
  );
}
function Zt() {
  if (nt !== null) {
    var e = $s(el),
      t = Ce.transition,
      n = O;
    try {
      if (((Ce.transition = null), (O = 16 > e ? 16 : e), nt === null)) var r = !1;
      else {
        if (((e = nt), (nt = null), (el = 0), R & 6)) throw Error(y(331));
        var l = R;
        for (R |= 4, k = e.current; k !== null; ) {
          var o = k,
            u = o.child;
          if (k.flags & 16) {
            var i = o.deletions;
            if (i !== null) {
              for (var s = 0; s < i.length; s++) {
                var c = i[s];
                for (k = c; k !== null; ) {
                  var m = k;
                  switch (m.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Tn(8, m, o);
                  }
                  var h = m.child;
                  if (h !== null) ((h.return = m), (k = h));
                  else
                    for (; k !== null; ) {
                      m = k;
                      var p = m.sibling,
                        g = m.return;
                      if ((qa(m), m === c)) {
                        k = null;
                        break;
                      }
                      if (p !== null) {
                        ((p.return = g), (k = p));
                        break;
                      }
                      k = g;
                    }
                }
              }
              var w = o.alternate;
              if (w !== null) {
                var S = w.child;
                if (S !== null) {
                  w.child = null;
                  do {
                    var F = S.sibling;
                    ((S.sibling = null), (S = F));
                  } while (S !== null);
                }
              }
              k = o;
            }
          }
          if (o.subtreeFlags & 2064 && u !== null) ((u.return = o), (k = u));
          else
            e: for (; k !== null; ) {
              if (((o = k), o.flags & 2048))
                switch (o.tag) {
                  case 0:
                  case 11:
                  case 15:
                    Tn(9, o, o.return);
                }
              var f = o.sibling;
              if (f !== null) {
                ((f.return = o.return), (k = f));
                break e;
              }
              k = o.return;
            }
        }
        var a = e.current;
        for (k = a; k !== null; ) {
          u = k;
          var d = u.child;
          if (u.subtreeFlags & 2064 && d !== null) ((d.return = u), (k = d));
          else
            e: for (u = a; k !== null; ) {
              if (((i = k), i.flags & 2048))
                try {
                  switch (i.tag) {
                    case 0:
                    case 11:
                    case 15:
                      dl(9, i);
                  }
                } catch (x) {
                  B(i, i.return, x);
                }
              if (i === u) {
                k = null;
                break e;
              }
              var v = i.sibling;
              if (v !== null) {
                ((v.return = i.return), (k = v));
                break e;
              }
              k = i.return;
            }
        }
        if (((R = l), ht(), Ae && typeof Ae.onPostCommitFiberRoot == 'function'))
          try {
            Ae.onPostCommitFiberRoot(ll, e);
          } catch {}
        r = !0;
      }
      return r;
    } finally {
      ((O = n), (Ce.transition = t));
    }
  }
  return !1;
}
function Gi(e, t, n) {
  ((t = nn(n, t)),
    (t = $a(e, t, 1)),
    (e = it(e, t, 1)),
    (t = ie()),
    e !== null && (Jn(e, 1, t), me(e, t)));
}
function B(e, t, n) {
  if (e.tag === 3) Gi(e, e, n);
  else
    for (; t !== null; ) {
      if (t.tag === 3) {
        Gi(t, e, n);
        break;
      } else if (t.tag === 1) {
        var r = t.stateNode;
        if (
          typeof t.type.getDerivedStateFromError == 'function' ||
          (typeof r.componentDidCatch == 'function' && (st === null || !st.has(r)))
        ) {
          ((e = nn(n, e)),
            (e = Ba(t, e, 1)),
            (t = it(t, e, 1)),
            (e = ie()),
            t !== null && (Jn(t, 1, e), me(t, e)));
          break;
        }
      }
      t = t.return;
    }
}
function Ud(e, t, n) {
  var r = e.pingCache;
  (r !== null && r.delete(t),
    (t = ie()),
    (e.pingedLanes |= e.suspendedLanes & n),
    q === e &&
      (ee & n) === n &&
      (X === 4 || (X === 3 && (ee & 130023424) === ee && 500 > Q() - ju) ? Et(e, 0) : (Lu |= n)),
    me(e, t));
}
function sc(e, t) {
  t === 0 && (e.mode & 1 ? ((t = ar), (ar <<= 1), !(ar & 130023424) && (ar = 4194304)) : (t = 1));
  var n = ie();
  ((e = Ge(e, t)), e !== null && (Jn(e, t, n), me(e, n)));
}
function Vd(e) {
  var t = e.memoizedState,
    n = 0;
  (t !== null && (n = t.retryLane), sc(e, n));
}
function $d(e, t) {
  var n = 0;
  switch (e.tag) {
    case 13:
      var r = e.stateNode,
        l = e.memoizedState;
      l !== null && (n = l.retryLane);
      break;
    case 19:
      r = e.stateNode;
      break;
    default:
      throw Error(y(314));
  }
  (r !== null && r.delete(t), sc(e, n));
}
var ac;
ac = function (e, t, n) {
  if (e !== null)
    if (e.memoizedProps !== t.pendingProps || de.current) fe = !0;
    else {
      if (!(e.lanes & n) && !(t.flags & 128)) return ((fe = !1), zd(e, t, n));
      fe = !!(e.flags & 131072);
    }
  else ((fe = !1), A && t.flags & 1048576 && pa(t, Qr, t.index));
  switch (((t.lanes = 0), t.tag)) {
    case 2:
      var r = t.type;
      (Tr(e, t), (e = t.pendingProps));
      var l = qt(t, oe.current);
      (Xt(t, n), (l = Cu(null, t, r, e, l, n)));
      var o = _u();
      return (
        (t.flags |= 1),
        typeof l == 'object' && l !== null && typeof l.render == 'function' && l.$$typeof === void 0
          ? ((t.tag = 1),
            (t.memoizedState = null),
            (t.updateQueue = null),
            pe(r) ? ((o = !0), Wr(t)) : (o = !1),
            (t.memoizedState = l.state !== null && l.state !== void 0 ? l.state : null),
            wu(t),
            (l.updater = fl),
            (t.stateNode = l),
            (l._reactInternals = t),
            Lo(t, r, e, n),
            (t = Oo(null, t, r, !0, o, n)))
          : ((t.tag = 0), A && o && du(t), ue(null, t, l, n), (t = t.child)),
        t
      );
    case 16:
      r = t.elementType;
      e: {
        switch (
          (Tr(e, t),
          (e = t.pendingProps),
          (l = r._init),
          (r = l(r._payload)),
          (t.type = r),
          (l = t.tag = Wd(r)),
          (e = Te(r, e)),
          l)
        ) {
          case 0:
            t = Ro(null, t, r, e, n);
            break e;
          case 1:
            t = Fi(null, t, r, e, n);
            break e;
          case 11:
            t = Mi(null, t, r, e, n);
            break e;
          case 14:
            t = Ii(null, t, r, Te(r.type, e), n);
            break e;
        }
        throw Error(y(306, r, ''));
      }
      return t;
    case 0:
      return (
        (r = t.type),
        (l = t.pendingProps),
        (l = t.elementType === r ? l : Te(r, l)),
        Ro(e, t, r, l, n)
      );
    case 1:
      return (
        (r = t.type),
        (l = t.pendingProps),
        (l = t.elementType === r ? l : Te(r, l)),
        Fi(e, t, r, l, n)
      );
    case 3:
      e: {
        if ((Ka(t), e === null)) throw Error(y(387));
        ((r = t.pendingProps), (o = t.memoizedState), (l = o.element), wa(e, t), Yr(t, r, null, n));
        var u = t.memoizedState;
        if (((r = u.element), o.isDehydrated))
          if (
            ((o = {
              element: r,
              isDehydrated: !1,
              cache: u.cache,
              pendingSuspenseBoundaries: u.pendingSuspenseBoundaries,
              transitions: u.transitions,
            }),
            (t.updateQueue.baseState = o),
            (t.memoizedState = o),
            t.flags & 256)
          ) {
            ((l = nn(Error(y(423)), t)), (t = Ai(e, t, r, n, l)));
            break e;
          } else if (r !== l) {
            ((l = nn(Error(y(424)), t)), (t = Ai(e, t, r, n, l)));
            break e;
          } else
            for (
              ve = ut(t.stateNode.containerInfo.firstChild),
                ye = t,
                A = !0,
                je = null,
                n = ya(t, null, r, n),
                t.child = n;
              n;
            )
              ((n.flags = (n.flags & -3) | 4096), (n = n.sibling));
        else {
          if ((bt(), r === l)) {
            t = Ye(e, t, n);
            break e;
          }
          ue(e, t, r, n);
        }
        t = t.child;
      }
      return t;
    case 5:
      return (
        Sa(t),
        e === null && Po(t),
        (r = t.type),
        (l = t.pendingProps),
        (o = e !== null ? e.memoizedProps : null),
        (u = l.children),
        xo(r, l) ? (u = null) : o !== null && xo(r, o) && (t.flags |= 32),
        Qa(e, t),
        ue(e, t, u, n),
        t.child
      );
    case 6:
      return (e === null && Po(t), null);
    case 13:
      return Ga(e, t, n);
    case 4:
      return (
        Su(t, t.stateNode.containerInfo),
        (r = t.pendingProps),
        e === null ? (t.child = en(t, null, r, n)) : ue(e, t, r, n),
        t.child
      );
    case 11:
      return (
        (r = t.type),
        (l = t.pendingProps),
        (l = t.elementType === r ? l : Te(r, l)),
        Mi(e, t, r, l, n)
      );
    case 7:
      return (ue(e, t, t.pendingProps, n), t.child);
    case 8:
      return (ue(e, t, t.pendingProps.children, n), t.child);
    case 12:
      return (ue(e, t, t.pendingProps.children, n), t.child);
    case 10:
      e: {
        if (
          ((r = t.type._context),
          (l = t.pendingProps),
          (o = t.memoizedProps),
          (u = l.value),
          D(Kr, r._currentValue),
          (r._currentValue = u),
          o !== null)
        )
          if (De(o.value, u)) {
            if (o.children === l.children && !de.current) {
              t = Ye(e, t, n);
              break e;
            }
          } else
            for (o = t.child, o !== null && (o.return = t); o !== null; ) {
              var i = o.dependencies;
              if (i !== null) {
                u = o.child;
                for (var s = i.firstContext; s !== null; ) {
                  if (s.context === r) {
                    if (o.tag === 1) {
                      ((s = He(-1, n & -n)), (s.tag = 2));
                      var c = o.updateQueue;
                      if (c !== null) {
                        c = c.shared;
                        var m = c.pending;
                        (m === null ? (s.next = s) : ((s.next = m.next), (m.next = s)),
                          (c.pending = s));
                      }
                    }
                    ((o.lanes |= n),
                      (s = o.alternate),
                      s !== null && (s.lanes |= n),
                      zo(o.return, n, t),
                      (i.lanes |= n));
                    break;
                  }
                  s = s.next;
                }
              } else if (o.tag === 10) u = o.type === t.type ? null : o.child;
              else if (o.tag === 18) {
                if (((u = o.return), u === null)) throw Error(y(341));
                ((u.lanes |= n),
                  (i = u.alternate),
                  i !== null && (i.lanes |= n),
                  zo(u, n, t),
                  (u = o.sibling));
              } else u = o.child;
              if (u !== null) u.return = o;
              else
                for (u = o; u !== null; ) {
                  if (u === t) {
                    u = null;
                    break;
                  }
                  if (((o = u.sibling), o !== null)) {
                    ((o.return = u.return), (u = o));
                    break;
                  }
                  u = u.return;
                }
              o = u;
            }
        (ue(e, t, l.children, n), (t = t.child));
      }
      return t;
    case 9:
      return (
        (l = t.type),
        (r = t.pendingProps.children),
        Xt(t, n),
        (l = _e(l)),
        (r = r(l)),
        (t.flags |= 1),
        ue(e, t, r, n),
        t.child
      );
    case 14:
      return ((r = t.type), (l = Te(r, t.pendingProps)), (l = Te(r.type, l)), Ii(e, t, r, l, n));
    case 15:
      return Wa(e, t, t.type, t.pendingProps, n);
    case 17:
      return (
        (r = t.type),
        (l = t.pendingProps),
        (l = t.elementType === r ? l : Te(r, l)),
        Tr(e, t),
        (t.tag = 1),
        pe(r) ? ((e = !0), Wr(t)) : (e = !1),
        Xt(t, n),
        Va(t, r, l),
        Lo(t, r, l, n),
        Oo(null, t, r, !0, e, n)
      );
    case 19:
      return Ya(e, t, n);
    case 22:
      return Ha(e, t, n);
  }
  throw Error(y(156, t.tag));
};
function cc(e, t) {
  return Fs(e, t);
}
function Bd(e, t, n, r) {
  ((this.tag = e),
    (this.key = n),
    (this.sibling =
      this.child =
      this.return =
      this.stateNode =
      this.type =
      this.elementType =
        null),
    (this.index = 0),
    (this.ref = null),
    (this.pendingProps = t),
    (this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null),
    (this.mode = r),
    (this.subtreeFlags = this.flags = 0),
    (this.deletions = null),
    (this.childLanes = this.lanes = 0),
    (this.alternate = null));
}
function Ee(e, t, n, r) {
  return new Bd(e, t, n, r);
}
function Mu(e) {
  return ((e = e.prototype), !(!e || !e.isReactComponent));
}
function Wd(e) {
  if (typeof e == 'function') return Mu(e) ? 1 : 0;
  if (e != null) {
    if (((e = e.$$typeof), e === eu)) return 11;
    if (e === tu) return 14;
  }
  return 2;
}
function ct(e, t) {
  var n = e.alternate;
  return (
    n === null
      ? ((n = Ee(e.tag, t, e.key, e.mode)),
        (n.elementType = e.elementType),
        (n.type = e.type),
        (n.stateNode = e.stateNode),
        (n.alternate = e),
        (e.alternate = n))
      : ((n.pendingProps = t),
        (n.type = e.type),
        (n.flags = 0),
        (n.subtreeFlags = 0),
        (n.deletions = null)),
    (n.flags = e.flags & 14680064),
    (n.childLanes = e.childLanes),
    (n.lanes = e.lanes),
    (n.child = e.child),
    (n.memoizedProps = e.memoizedProps),
    (n.memoizedState = e.memoizedState),
    (n.updateQueue = e.updateQueue),
    (t = e.dependencies),
    (n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }),
    (n.sibling = e.sibling),
    (n.index = e.index),
    (n.ref = e.ref),
    n
  );
}
function Rr(e, t, n, r, l, o) {
  var u = 2;
  if (((r = e), typeof e == 'function')) Mu(e) && (u = 1);
  else if (typeof e == 'string') u = 5;
  else
    e: switch (e) {
      case Dt:
        return Ct(n.children, l, o, t);
      case bo:
        ((u = 8), (l |= 8));
        break;
      case bl:
        return ((e = Ee(12, n, t, l | 2)), (e.elementType = bl), (e.lanes = o), e);
      case eo:
        return ((e = Ee(13, n, t, l)), (e.elementType = eo), (e.lanes = o), e);
      case to:
        return ((e = Ee(19, n, t, l)), (e.elementType = to), (e.lanes = o), e);
      case Ss:
        return ml(n, l, o, t);
      default:
        if (typeof e == 'object' && e !== null)
          switch (e.$$typeof) {
            case gs:
              u = 10;
              break e;
            case ws:
              u = 9;
              break e;
            case eu:
              u = 11;
              break e;
            case tu:
              u = 14;
              break e;
            case Je:
              ((u = 16), (r = null));
              break e;
          }
        throw Error(y(130, e == null ? e : typeof e, ''));
    }
  return ((t = Ee(u, n, t, l)), (t.elementType = e), (t.type = r), (t.lanes = o), t);
}
function Ct(e, t, n, r) {
  return ((e = Ee(7, e, r, t)), (e.lanes = n), e);
}
function ml(e, t, n, r) {
  return (
    (e = Ee(22, e, r, t)),
    (e.elementType = Ss),
    (e.lanes = n),
    (e.stateNode = { isHidden: !1 }),
    e
  );
}
function Yl(e, t, n) {
  return ((e = Ee(6, e, null, t)), (e.lanes = n), e);
}
function Xl(e, t, n) {
  return (
    (t = Ee(4, e.children !== null ? e.children : [], e.key, t)),
    (t.lanes = n),
    (t.stateNode = {
      containerInfo: e.containerInfo,
      pendingChildren: null,
      implementation: e.implementation,
    }),
    t
  );
}
function Hd(e, t, n, r, l) {
  ((this.tag = t),
    (this.containerInfo = e),
    (this.finishedWork = this.pingCache = this.current = this.pendingChildren = null),
    (this.timeoutHandle = -1),
    (this.callbackNode = this.pendingContext = this.context = null),
    (this.callbackPriority = 0),
    (this.eventTimes = Tl(0)),
    (this.expirationTimes = Tl(-1)),
    (this.entangledLanes =
      this.finishedLanes =
      this.mutableReadLanes =
      this.expiredLanes =
      this.pingedLanes =
      this.suspendedLanes =
      this.pendingLanes =
        0),
    (this.entanglements = Tl(0)),
    (this.identifierPrefix = r),
    (this.onRecoverableError = l),
    (this.mutableSourceEagerHydrationData = null));
}
function Iu(e, t, n, r, l, o, u, i, s) {
  return (
    (e = new Hd(e, t, n, i, s)),
    t === 1 ? ((t = 1), o === !0 && (t |= 8)) : (t = 0),
    (o = Ee(3, null, null, t)),
    (e.current = o),
    (o.stateNode = e),
    (o.memoizedState = {
      element: r,
      isDehydrated: n,
      cache: null,
      transitions: null,
      pendingSuspenseBoundaries: null,
    }),
    wu(o),
    e
  );
}
function Qd(e, t, n) {
  var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
  return {
    $$typeof: Ot,
    key: r == null ? null : '' + r,
    children: e,
    containerInfo: t,
    implementation: n,
  };
}
function fc(e) {
  if (!e) return dt;
  e = e._reactInternals;
  e: {
    if (jt(e) !== e || e.tag !== 1) throw Error(y(170));
    var t = e;
    do {
      switch (t.tag) {
        case 3:
          t = t.stateNode.context;
          break e;
        case 1:
          if (pe(t.type)) {
            t = t.stateNode.__reactInternalMemoizedMergedChildContext;
            break e;
          }
      }
      t = t.return;
    } while (t !== null);
    throw Error(y(171));
  }
  if (e.tag === 1) {
    var n = e.type;
    if (pe(n)) return fa(e, n, t);
  }
  return t;
}
function dc(e, t, n, r, l, o, u, i, s) {
  return (
    (e = Iu(n, r, !0, e, l, o, u, i, s)),
    (e.context = fc(null)),
    (n = e.current),
    (r = ie()),
    (l = at(n)),
    (o = He(r, l)),
    (o.callback = t ?? null),
    it(n, o, l),
    (e.current.lanes = l),
    Jn(e, l, r),
    me(e, r),
    e
  );
}
function hl(e, t, n, r) {
  var l = t.current,
    o = ie(),
    u = at(l);
  return (
    (n = fc(n)),
    t.context === null ? (t.context = n) : (t.pendingContext = n),
    (t = He(o, u)),
    (t.payload = { element: e }),
    (r = r === void 0 ? null : r),
    r !== null && (t.callback = r),
    (e = it(l, t, u)),
    e !== null && (Oe(e, l, u, o), Nr(e, l, u)),
    u
  );
}
function nl(e) {
  if (((e = e.current), !e.child)) return null;
  switch (e.child.tag) {
    case 5:
      return e.child.stateNode;
    default:
      return e.child.stateNode;
  }
}
function Yi(e, t) {
  if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
    var n = e.retryLane;
    e.retryLane = n !== 0 && n < t ? n : t;
  }
}
function Fu(e, t) {
  (Yi(e, t), (e = e.alternate) && Yi(e, t));
}
function Kd() {
  return null;
}
var pc =
  typeof reportError == 'function'
    ? reportError
    : function (e) {
        console.error(e);
      };
function Au(e) {
  this._internalRoot = e;
}
vl.prototype.render = Au.prototype.render = function (e) {
  var t = this._internalRoot;
  if (t === null) throw Error(y(409));
  hl(e, t, null, null);
};
vl.prototype.unmount = Au.prototype.unmount = function () {
  var e = this._internalRoot;
  if (e !== null) {
    this._internalRoot = null;
    var t = e.containerInfo;
    (Tt(function () {
      hl(null, e, null, null);
    }),
      (t[Ke] = null));
  }
};
function vl(e) {
  this._internalRoot = e;
}
vl.prototype.unstable_scheduleHydration = function (e) {
  if (e) {
    var t = Hs();
    e = { blockedOn: null, target: e, priority: t };
    for (var n = 0; n < be.length && t !== 0 && t < be[n].priority; n++);
    (be.splice(n, 0, e), n === 0 && Ks(e));
  }
};
function Uu(e) {
  return !(!e || (e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11));
}
function yl(e) {
  return !(
    !e ||
    (e.nodeType !== 1 &&
      e.nodeType !== 9 &&
      e.nodeType !== 11 &&
      (e.nodeType !== 8 || e.nodeValue !== ' react-mount-point-unstable '))
  );
}
function Xi() {}
function Gd(e, t, n, r, l) {
  if (l) {
    if (typeof r == 'function') {
      var o = r;
      r = function () {
        var c = nl(u);
        o.call(c);
      };
    }
    var u = dc(t, r, e, 0, null, !1, !1, '', Xi);
    return (
      (e._reactRootContainer = u),
      (e[Ke] = u.current),
      Vn(e.nodeType === 8 ? e.parentNode : e),
      Tt(),
      u
    );
  }
  for (; (l = e.lastChild); ) e.removeChild(l);
  if (typeof r == 'function') {
    var i = r;
    r = function () {
      var c = nl(s);
      i.call(c);
    };
  }
  var s = Iu(e, 0, !1, null, null, !1, !1, '', Xi);
  return (
    (e._reactRootContainer = s),
    (e[Ke] = s.current),
    Vn(e.nodeType === 8 ? e.parentNode : e),
    Tt(function () {
      hl(t, s, n, r);
    }),
    s
  );
}
function gl(e, t, n, r, l) {
  var o = n._reactRootContainer;
  if (o) {
    var u = o;
    if (typeof l == 'function') {
      var i = l;
      l = function () {
        var s = nl(u);
        i.call(s);
      };
    }
    hl(t, u, e, l);
  } else u = Gd(n, t, e, l, r);
  return nl(u);
}
Bs = function (e) {
  switch (e.tag) {
    case 3:
      var t = e.stateNode;
      if (t.current.memoizedState.isDehydrated) {
        var n = kn(t.pendingLanes);
        n !== 0 && (lu(t, n | 1), me(t, Q()), !(R & 6) && ((rn = Q() + 500), ht()));
      }
      break;
    case 13:
      (Tt(function () {
        var r = Ge(e, 1);
        if (r !== null) {
          var l = ie();
          Oe(r, e, 1, l);
        }
      }),
        Fu(e, 1));
  }
};
ou = function (e) {
  if (e.tag === 13) {
    var t = Ge(e, 134217728);
    if (t !== null) {
      var n = ie();
      Oe(t, e, 134217728, n);
    }
    Fu(e, 134217728);
  }
};
Ws = function (e) {
  if (e.tag === 13) {
    var t = at(e),
      n = Ge(e, t);
    if (n !== null) {
      var r = ie();
      Oe(n, e, t, r);
    }
    Fu(e, t);
  }
};
Hs = function () {
  return O;
};
Qs = function (e, t) {
  var n = O;
  try {
    return ((O = e), t());
  } finally {
    O = n;
  }
};
fo = function (e, t, n) {
  switch (t) {
    case 'input':
      if ((lo(e, n), (t = n.name), n.type === 'radio' && t != null)) {
        for (n = e; n.parentNode; ) n = n.parentNode;
        for (
          n = n.querySelectorAll('input[name=' + JSON.stringify('' + t) + '][type="radio"]'), t = 0;
          t < n.length;
          t++
        ) {
          var r = n[t];
          if (r !== e && r.form === e.form) {
            var l = sl(r);
            if (!l) throw Error(y(90));
            (xs(r), lo(r, l));
          }
        }
      }
      break;
    case 'textarea':
      Cs(e, n);
      break;
    case 'select':
      ((t = n.value), t != null && Qt(e, !!n.multiple, t, !1));
  }
};
js = Ru;
Rs = Tt;
var Yd = { usingClientEntryPoint: !1, Events: [bn, At, sl, Ts, Ls, Ru] },
  gn = {
    findFiberByHostInstance: St,
    bundleType: 0,
    version: '18.3.1',
    rendererPackageName: 'react-dom',
  },
  Xd = {
    bundleType: gn.bundleType,
    version: gn.version,
    rendererPackageName: gn.rendererPackageName,
    rendererConfig: gn.rendererConfig,
    overrideHookState: null,
    overrideHookStateDeletePath: null,
    overrideHookStateRenamePath: null,
    overrideProps: null,
    overridePropsDeletePath: null,
    overridePropsRenamePath: null,
    setErrorHandler: null,
    setSuspenseHandler: null,
    scheduleUpdate: null,
    currentDispatcherRef: Xe.ReactCurrentDispatcher,
    findHostInstanceByFiber: function (e) {
      return ((e = Ms(e)), e === null ? null : e.stateNode);
    },
    findFiberByHostInstance: gn.findFiberByHostInstance || Kd,
    findHostInstancesForRefresh: null,
    scheduleRefresh: null,
    scheduleRoot: null,
    setRefreshHandler: null,
    getCurrentFiber: null,
    reconcilerVersion: '18.3.1-next-f1338f8080-20240426',
  };
if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < 'u') {
  var Sr = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!Sr.isDisabled && Sr.supportsFiber)
    try {
      ((ll = Sr.inject(Xd)), (Ae = Sr));
    } catch {}
}
we.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Yd;
we.createPortal = function (e, t) {
  var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
  if (!Uu(t)) throw Error(y(200));
  return Qd(e, t, null, n);
};
we.createRoot = function (e, t) {
  if (!Uu(e)) throw Error(y(299));
  var n = !1,
    r = '',
    l = pc;
  return (
    t != null &&
      (t.unstable_strictMode === !0 && (n = !0),
      t.identifierPrefix !== void 0 && (r = t.identifierPrefix),
      t.onRecoverableError !== void 0 && (l = t.onRecoverableError)),
    (t = Iu(e, 1, !1, null, null, n, !1, r, l)),
    (e[Ke] = t.current),
    Vn(e.nodeType === 8 ? e.parentNode : e),
    new Au(t)
  );
};
we.findDOMNode = function (e) {
  if (e == null) return null;
  if (e.nodeType === 1) return e;
  var t = e._reactInternals;
  if (t === void 0)
    throw typeof e.render == 'function'
      ? Error(y(188))
      : ((e = Object.keys(e).join(',')), Error(y(268, e)));
  return ((e = Ms(t)), (e = e === null ? null : e.stateNode), e);
};
we.flushSync = function (e) {
  return Tt(e);
};
we.hydrate = function (e, t, n) {
  if (!yl(t)) throw Error(y(200));
  return gl(null, e, t, !0, n);
};
we.hydrateRoot = function (e, t, n) {
  if (!Uu(e)) throw Error(y(405));
  var r = (n != null && n.hydratedSources) || null,
    l = !1,
    o = '',
    u = pc;
  if (
    (n != null &&
      (n.unstable_strictMode === !0 && (l = !0),
      n.identifierPrefix !== void 0 && (o = n.identifierPrefix),
      n.onRecoverableError !== void 0 && (u = n.onRecoverableError)),
    (t = dc(t, null, e, 1, n ?? null, l, !1, o, u)),
    (e[Ke] = t.current),
    Vn(e),
    r)
  )
    for (e = 0; e < r.length; e++)
      ((n = r[e]),
        (l = n._getVersion),
        (l = l(n._source)),
        t.mutableSourceEagerHydrationData == null
          ? (t.mutableSourceEagerHydrationData = [n, l])
          : t.mutableSourceEagerHydrationData.push(n, l));
  return new vl(t);
};
we.render = function (e, t, n) {
  if (!yl(t)) throw Error(y(200));
  return gl(null, e, t, !1, n);
};
we.unmountComponentAtNode = function (e) {
  if (!yl(e)) throw Error(y(40));
  return e._reactRootContainer
    ? (Tt(function () {
        gl(null, null, e, !1, function () {
          ((e._reactRootContainer = null), (e[Ke] = null));
        });
      }),
      !0)
    : !1;
};
we.unstable_batchedUpdates = Ru;
we.unstable_renderSubtreeIntoContainer = function (e, t, n, r) {
  if (!yl(n)) throw Error(y(200));
  if (e == null || e._reactInternals === void 0) throw Error(y(38));
  return gl(e, t, n, !1, r);
};
we.version = '18.3.1-next-f1338f8080-20240426';
function mc() {
  if (
    !(
      typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > 'u' ||
      typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != 'function'
    )
  )
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(mc);
    } catch (e) {
      console.error(e);
    }
}
(mc(), (ms.exports = we));
var Zd = ms.exports,
  hc,
  Zi = Zd;
((hc = Jl.createRoot = Zi.createRoot), (Jl.hydrateRoot = Zi.hydrateRoot));
const Jd = {},
  Ji = e => {
    let t;
    const n = new Set(),
      r = (m, h) => {
        const p = typeof m == 'function' ? m(t) : m;
        if (!Object.is(p, t)) {
          const g = t;
          ((t = (h ?? (typeof p != 'object' || p === null)) ? p : Object.assign({}, t, p)),
            n.forEach(w => w(t, g)));
        }
      },
      l = () => t,
      s = {
        setState: r,
        getState: l,
        getInitialState: () => c,
        subscribe: m => (n.add(m), () => n.delete(m)),
        destroy: () => {
          ((Jd ? 'production' : void 0) !== 'production' &&
            console.warn(
              '[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected.'
            ),
            n.clear());
        },
      },
      c = (t = e(r, l, s));
    return s;
  },
  qd = e => (e ? Ji(e) : Ji);
var vc = { exports: {} },
  yc = {},
  gc = { exports: {} },
  wc = {};
/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var ln = K;
function bd(e, t) {
  return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
}
var ep = typeof Object.is == 'function' ? Object.is : bd,
  tp = ln.useState,
  np = ln.useEffect,
  rp = ln.useLayoutEffect,
  lp = ln.useDebugValue;
function op(e, t) {
  var n = t(),
    r = tp({ inst: { value: n, getSnapshot: t } }),
    l = r[0].inst,
    o = r[1];
  return (
    rp(
      function () {
        ((l.value = n), (l.getSnapshot = t), Zl(l) && o({ inst: l }));
      },
      [e, n, t]
    ),
    np(
      function () {
        return (
          Zl(l) && o({ inst: l }),
          e(function () {
            Zl(l) && o({ inst: l });
          })
        );
      },
      [e]
    ),
    lp(n),
    n
  );
}
function Zl(e) {
  var t = e.getSnapshot;
  e = e.value;
  try {
    var n = t();
    return !ep(e, n);
  } catch {
    return !0;
  }
}
function up(e, t) {
  return t();
}
var ip =
  typeof window > 'u' || typeof window.document > 'u' || typeof window.document.createElement > 'u'
    ? up
    : op;
wc.useSyncExternalStore = ln.useSyncExternalStore !== void 0 ? ln.useSyncExternalStore : ip;
gc.exports = wc;
var sp = gc.exports;
/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var wl = K,
  ap = sp;
function cp(e, t) {
  return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
}
var fp = typeof Object.is == 'function' ? Object.is : cp,
  dp = ap.useSyncExternalStore,
  pp = wl.useRef,
  mp = wl.useEffect,
  hp = wl.useMemo,
  vp = wl.useDebugValue;
yc.useSyncExternalStoreWithSelector = function (e, t, n, r, l) {
  var o = pp(null);
  if (o.current === null) {
    var u = { hasValue: !1, value: null };
    o.current = u;
  } else u = o.current;
  o = hp(
    function () {
      function s(g) {
        if (!c) {
          if (((c = !0), (m = g), (g = r(g)), l !== void 0 && u.hasValue)) {
            var w = u.value;
            if (l(w, g)) return (h = w);
          }
          return (h = g);
        }
        if (((w = h), fp(m, g))) return w;
        var S = r(g);
        return l !== void 0 && l(w, S) ? ((m = g), w) : ((m = g), (h = S));
      }
      var c = !1,
        m,
        h,
        p = n === void 0 ? null : n;
      return [
        function () {
          return s(t());
        },
        p === null
          ? void 0
          : function () {
              return s(p());
            },
      ];
    },
    [t, n, r, l]
  );
  var i = dp(e, o[0], o[1]);
  return (
    mp(
      function () {
        ((u.hasValue = !0), (u.value = i));
      },
      [i]
    ),
    vp(i),
    i
  );
};
vc.exports = yc;
var yp = vc.exports;
const gp = ts(yp),
  Sc = {},
  { useDebugValue: wp } = ds,
  { useSyncExternalStoreWithSelector: Sp } = gp;
let qi = !1;
const kp = e => e;
function xp(e, t = kp, n) {
  (Sc ? 'production' : void 0) !== 'production' &&
    n &&
    !qi &&
    (console.warn(
      "[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937"
    ),
    (qi = !0));
  const r = Sp(e.subscribe, e.getState, e.getServerState || e.getInitialState, t, n);
  return (wp(r), r);
}
const bi = e => {
    (Sc ? 'production' : void 0) !== 'production' &&
      typeof e != 'function' &&
      console.warn(
        "[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`."
      );
    const t = typeof e == 'function' ? qd(e) : e,
      n = (r, l) => xp(t, r, l);
    return (Object.assign(n, t), n);
  },
  Sl = e => (e ? bi(e) : bi),
  Vu = Sl(e => ({
    apps: new Map(),
    registerApp: t =>
      e(n => {
        const r = new Map(n.apps);
        return (r.set(t.id, t), { apps: r });
      }),
  })),
  Xn = Sl(e => ({
    window: null,
    openWindow: (t, n = {}) => e({ window: { appId: t, args: n } }),
    closeWindow: () => e({ window: null }),
  })),
  Ep = (() => {
    try {
      const e = localStorage.getItem('emobile-theme');
      if (e === 'light' || e === 'dark') return e;
    } catch {}
    return 'dark';
  })(),
  kc = Sl(e => ({
    theme: Ep,
    toggle: () =>
      e(t => {
        const n = t.theme === 'dark' ? 'light' : 'dark';
        try {
          localStorage.setItem('emobile-theme', n);
        } catch {}
        return (document.documentElement.setAttribute('data-theme', n), { theme: n });
      }),
    setTheme: t => {
      try {
        localStorage.setItem('emobile-theme', t);
      } catch {}
      (document.documentElement.setAttribute('data-theme', t), e({ theme: t }));
    },
  })),
  xc = Sl(e => ({
    toasts: [],
    addToast: t => {
      const n = Math.random().toString(36).slice(2);
      (e(r => ({ toasts: [...r.toasts, { id: n, message: t }] })),
        setTimeout(() => {
          e(r => ({ toasts: r.toasts.filter(l => l.id !== n) }));
        }, 3e3));
    },
    removeToast: t => e(n => ({ toasts: n.toasts.filter(r => r.id !== t) })),
  })),
  tr = {
    version: '1.0.0',
    registerApp(e) {
      Vu.getState().registerApp(e);
    },
    launchApp(e, t) {
      Xn.getState().openWindow(e, t);
    },
    quitApp() {
      Xn.getState().closeWindow();
    },
    toast(e) {
      xc.getState().addToast(e);
    },
  };
window.tvContext = tr;
function Cp() {
  const { theme: e, toggle: t } = kc();
  return P.jsx('button', {
    onClick: t,
    title: e === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
    className: 'rounded-full p-2 transition-all duration-200 active:scale-90',
    style: {
      background: 'var(--glass-tile)',
      border: '1px solid var(--glass-border)',
      color: 'var(--glass-text)',
      cursor: 'pointer',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      fontSize: 16,
      lineHeight: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 36,
      height: 36,
    },
    children: e === 'dark' ? '☀️' : '🌑',
  });
}
function _p() {
  const [e, t] = K.useState(() => es(new Date()));
  return (
    K.useEffect(() => {
      const n = setInterval(() => t(es(new Date())), 1e3);
      return () => clearInterval(n);
    }, []),
    P.jsxs('header', {
      className: 'flex items-center justify-between px-6 py-3 shrink-0',
      style: {
        background: 'var(--statusbar-bg)',
        borderBottom: '1px solid var(--statusbar-border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        color: 'var(--glass-text)',
      },
      children: [
        P.jsxs('div', {
          className: 'flex items-center gap-3',
          children: [
            P.jsx('span', { className: 'text-2xl select-none', children: '📺' }),
            P.jsx('span', {
              className: 'font-bold text-base tracking-widest uppercase',
              style: { color: 'var(--glass-accent)', letterSpacing: '0.15em' },
              children: 'eMobile OS',
            }),
          ],
        }),
        P.jsxs('div', {
          className: 'flex items-center gap-4',
          children: [
            P.jsx('span', {
              className: 'font-medium tabular-nums text-sm',
              style: { color: 'var(--glass-muted)' },
              children: e,
            }),
            P.jsx(Cp, {}),
          ],
        }),
      ],
    })
  );
}
function es(e) {
  return e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function Np({ app: e, onLaunch: t, tabIndex: n = 0 }) {
  return P.jsxs('button', {
    className:
      'glass-tile rounded-2xl flex flex-col items-center justify-center gap-3 p-6 cursor-pointer w-full aspect-square',
    tabIndex: n,
    onClick: () => t(e.id),
    onKeyDown: r => {
      (r.key === 'Enter' || r.key === ' ') && (r.preventDefault(), t(e.id));
    },
    type: 'button',
    'aria-label': `Launch ${e.name}`,
    children: [
      P.jsx('span', {
        className: 'select-none leading-none',
        style: { fontSize: 52, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' },
        children: e.icon,
      }),
      P.jsx('span', {
        className: 'font-semibold text-sm text-center leading-tight',
        style: { color: 'var(--glass-text)' },
        children: e.name,
      }),
      e.category &&
        P.jsx('span', {
          className: 'text-xs px-2 py-0.5 rounded-full font-medium',
          style: {
            background: 'var(--glass-accent-glow)',
            color: 'var(--glass-accent)',
            border: '1px solid var(--glass-accent-glow)',
          },
          children: e.category,
        }),
    ],
  });
}
function Pp({ onLaunch: e }) {
  const t = Vu(l => Array.from(l.apps.values())),
    n = K.useRef(null),
    r = K.useCallback(l => {
      var c;
      if (!n.current) return;
      const o = Array.from(n.current.querySelectorAll('button[tabindex]')),
        u = o.findIndex(m => m === document.activeElement);
      if (u === -1) return;
      const i =
        Math.round(
          n.current.clientWidth /
            ((c = o[0]) != null && c.parentElement ? o[0].parentElement.clientWidth : 200)
        ) || 1;
      let s = -1;
      (l.key === 'ArrowRight'
        ? (s = Math.min(u + 1, o.length - 1))
        : l.key === 'ArrowLeft'
          ? (s = Math.max(u - 1, 0))
          : l.key === 'ArrowDown'
            ? (s = Math.min(u + i, o.length - 1))
            : l.key === 'ArrowUp' && (s = Math.max(u - i, 0)),
        s !== -1 && s !== u && (l.preventDefault(), o[s].focus()));
    }, []);
  return (
    K.useEffect(() => {
      const l = n.current;
      if (l) return (l.addEventListener('keydown', r), () => l.removeEventListener('keydown', r));
    }, [r]),
    t.length === 0
      ? P.jsx('div', {
          className: 'flex-1 flex items-center justify-center',
          style: { color: 'var(--glass-muted)' },
          children: P.jsxs('div', {
            className: 'text-center',
            children: [
              P.jsx('div', { className: 'text-6xl mb-4', children: '📦' }),
              P.jsx('div', { className: 'text-lg font-medium', children: 'No apps installed' }),
            ],
          }),
        })
      : P.jsx('div', {
          className: 'flex-1 overflow-y-auto p-8',
          children: P.jsx('div', {
            ref: n,
            className: 'grid gap-5',
            style: { gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' },
            children: t.map((l, o) =>
              P.jsx(Np, { app: l, onLaunch: e, tabIndex: o === 0 ? 0 : -1 }, l.id)
            ),
          }),
        })
  );
}
function zp() {
  return window.location.origin;
}
function Tp() {
  const e = Xn(s => s.window),
    t = Xn(s => s.closeWindow),
    n = Vu(s => s.apps),
    r = K.useRef(null),
    l = K.useRef(null);
  if (
    (K.useEffect(() => {
      if (!e) return;
      const s = c => {
        c.key === 'Escape' && t();
      };
      return (
        window.addEventListener('keydown', s),
        () => window.removeEventListener('keydown', s)
      );
    }, [e, t]),
    K.useEffect(() => {
      if (!e || !r.current) return;
      const s = r.current;
      if (e.appId === 'cart') {
        const m = typeof e.args.path == 'string' ? e.args.path : '',
          h = `${zp()}/cart-runner.html?path=${encodeURIComponent(m)}`;
        s.innerHTML = '';
        const p = document.createElement('iframe');
        return (
          (p.src = h),
          (p.style.cssText = 'width:100%;height:100%;border:none;display:block;background:#000;'),
          (p.allow = 'fullscreen'),
          (p.title = typeof e.args.title == 'string' ? e.args.title : 'Nova64 Game'),
          s.appendChild(p),
          () => {
            s.innerHTML = '';
          }
        );
      }
      const c = n.get(e.appId);
      if (c)
        return (
          (s.innerHTML = ''),
          c.mount(s, tr, e.args),
          (l.current = () => c.unmount()),
          () => {
            (l.current && (l.current(), (l.current = null)), (s.innerHTML = ''));
          }
        );
    }, [e, n]),
    !e)
  )
    return null;
  const o = e.appId === 'cart' ? null : n.get(e.appId),
    u =
      e.appId === 'cart'
        ? typeof e.args.title == 'string'
          ? e.args.title
          : 'Game'
        : ((o == null ? void 0 : o.name) ?? e.appId),
    i = e.appId === 'cart' ? '🎮' : ((o == null ? void 0 : o.icon) ?? '📦');
  return P.jsxs('div', {
    className: 'fixed inset-0 flex flex-col animate-slide-up',
    style: { zIndex: 200 },
    children: [
      P.jsxs('div', {
        className: 'flex items-center justify-between px-5 py-3 shrink-0',
        style: {
          background: 'var(--statusbar-bg)',
          borderBottom: '1px solid var(--statusbar-border)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          color: 'var(--glass-text)',
        },
        children: [
          P.jsxs('div', {
            className: 'flex items-center gap-3',
            children: [
              P.jsx('span', { className: 'text-2xl', children: i }),
              P.jsx('span', {
                className: 'font-semibold text-base',
                style: { color: 'var(--glass-text)' },
                children: u,
              }),
            ],
          }),
          P.jsx('button', {
            onClick: t,
            className:
              'rounded-full flex items-center justify-center w-9 h-9 transition-all duration-150 active:scale-90',
            style: {
              background: 'rgba(255,60,60,0.15)',
              border: '1px solid rgba(255,60,60,0.30)',
              color: 'rgba(255,100,100,0.90)',
              cursor: 'pointer',
              fontSize: 16,
            },
            title: 'Close (Esc)',
            children: '✕',
          }),
        ],
      }),
      P.jsx('div', { ref: r, className: 'flex-1 overflow-hidden', style: { background: '#000' } }),
    ],
  });
}
function Lp() {
  const { toasts: e, removeToast: t } = xc();
  return e.length === 0
    ? null
    : P.jsx('div', {
        className: 'fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center',
        style: { zIndex: 300, pointerEvents: 'none' },
        children: e.map(n =>
          P.jsx(
            'div',
            {
              className: 'animate-fade-in px-5 py-3 rounded-2xl text-sm font-medium',
              style: {
                background: 'var(--toast-bg)',
                border: '1px solid var(--toast-border)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                color: 'var(--glass-text)',
                boxShadow: 'var(--glass-shadow)',
                pointerEvents: 'auto',
                cursor: 'pointer',
              },
              onClick: () => t(n.id),
              children: n.message,
            },
            n.id
          )
        ),
      });
}
function jp() {
  const { theme: e } = kc(),
    t = Xn(r => r.openWindow);
  K.useEffect(() => {
    document.documentElement.setAttribute('data-theme', e);
  }, [e]);
  const n = K.useCallback(
    r => {
      tr.launchApp(r);
    },
    [t]
  );
  return P.jsxs('div', {
    className: 'w-screen h-screen flex flex-col overflow-hidden relative',
    style: { background: 'var(--shell-bg)', color: 'var(--glass-text)' },
    children: [
      P.jsx('div', {
        className: 'absolute inset-0 pointer-events-none',
        style: { background: 'var(--shell-bg-layer)' },
      }),
      P.jsxs('div', {
        className: 'relative flex flex-col h-full',
        children: [
          P.jsx(_p, {}),
          P.jsx('div', {
            className: 'px-8 pt-6 pb-2 shrink-0',
            children: P.jsx('h2', {
              className: 'text-xs font-semibold uppercase tracking-widest',
              style: { color: 'var(--glass-muted)' },
              children: 'All Applications',
            }),
          }),
          P.jsx(Pp, { onLaunch: n }),
        ],
      }),
      P.jsx(Tp, {}),
      P.jsx(Lp, {}),
    ],
  });
}
const Qo = [
    {
      id: 'fzero',
      name: 'F-ZERO RACING',
      description: 'Hyper-speed quantum racing',
      emoji: '🏎️',
      path: '/examples/f-zero-nova-3d/code.js',
      category: 'Racing',
      color: '#FF006E',
    },
    {
      id: 'starfox',
      name: 'STAR FOX NOVA',
      description: 'Epic space combat',
      emoji: '🚀',
      path: '/examples/star-fox-nova-3d/code.js',
      category: 'Shooter',
      color: '#3A86FF',
    },
    {
      id: 'cyberpunk',
      name: 'NEO TOKYO 2077',
      description: 'Neon dystopian adventure',
      emoji: '🌆',
      path: '/examples/cyberpunk-city-3d/code.js',
      category: 'Adventure',
      color: '#FF6B35',
    },
    {
      id: 'knight',
      name: 'GAUNTLET 64',
      description: 'Medieval combat realm',
      emoji: '⚔️',
      path: '/examples/strider-demo-3d/code.js',
      category: 'Action',
      color: '#06FFA5',
    },
    {
      id: 'plumber',
      name: 'SUPER PLUMBER 64',
      description: 'Classic platformer adventure',
      emoji: '🍄',
      path: '/examples/super-plumber-64/code.js',
      category: 'Platformer',
      color: '#FFD60A',
    },
    {
      id: 'minecraft',
      name: 'VOXEL REALM',
      description: 'Infinite procedural worlds',
      emoji: '⛏️',
      path: '/examples/minecraft-demo/code.js',
      category: 'Sandbox',
      color: '#06FFA5',
    },
    {
      id: 'crystal',
      name: 'CRYSTAL CATHEDRAL',
      description: 'Ultimate graphics showcase',
      emoji: '🏛️',
      path: '/examples/crystal-cathedral-3d/code.js',
      category: 'Demo',
      color: '#A78BFA',
    },
    {
      id: 'mystical',
      name: 'MYSTICAL REALM',
      description: 'Fantasy world adventure',
      emoji: '🏰',
      path: '/examples/mystical-realm-3d/code.js',
      category: 'Adventure',
      color: '#34D399',
    },
    {
      id: 'fps',
      name: 'FPS DEMO',
      description: 'First-person shooter',
      emoji: '🔫',
      path: '/examples/fps-demo-3d/code.js',
      category: 'Shooter',
      color: '#F43F5E',
    },
    {
      id: 'space',
      name: 'SPACE COMBAT',
      description: 'Deep space warfare',
      emoji: '🛸',
      path: '/examples/space-combat-3d/code.js',
      category: 'Shooter',
      color: '#8B5CF6',
    },
    {
      id: 'dungeons',
      name: 'DUNGEON CRAWLER',
      description: 'Dark dungeon exploration',
      emoji: '🏰',
      path: '/examples/dungeon-crawler-3d/code.js',
      category: 'RPG',
      color: '#F59E0B',
    },
    {
      id: 'physics',
      name: 'PHYSICS DEMO',
      description: 'Realistic physics sandbox',
      emoji: '⚛️',
      path: '/examples/physics-demo-3d/code.js',
      category: 'Demo',
      color: '#06B6D4',
    },
    {
      id: 'demoscene',
      name: 'DEMO∞SCENE',
      description: 'Audiovisual hypnosis',
      emoji: '✨',
      path: '/examples/demoscene/code.js',
      category: 'Demo',
      color: '#4CC9F0',
    },
    {
      id: 'nature',
      name: 'NATURE EXPLORER',
      description: 'Lush procedural environments',
      emoji: '🌿',
      path: '/examples/nature-explorer-3d/code.js',
      category: 'Explorer',
      color: '#22C55E',
    },
    {
      id: 'voxel-terrain',
      name: 'VOXEL TERRAIN',
      description: 'Vast voxel landscapes',
      emoji: '🌍',
      path: '/examples/voxel-terrain/code.js',
      category: 'Sandbox',
      color: '#10B981',
    },
    {
      id: 'boids',
      name: 'BOIDS FLOCKING',
      description: 'Emergent swarm behavior',
      emoji: '🐦',
      path: '/examples/boids-flocking/code.js',
      category: 'Simulation',
      color: '#7DD3FC',
    },
  ],
  Rp = ['All', ...Array.from(new Set(Qo.map(e => e.category)))];
function Op() {
  const [e, t] = K.useState('All'),
    [n, r] = K.useState(null),
    l = K.useRef(null),
    o = e === 'All' ? Qo : Qo.filter(i => i.category === e),
    u = K.useCallback(i => {
      tr.launchApp('cart', { path: i.path, title: `🎮 ${i.name}` });
    }, []);
  return (
    K.useEffect(() => {
      const i = s => {
        var g;
        if (!l.current) return;
        const c = Array.from(l.current.querySelectorAll('[data-game-tile]')),
          m = c.findIndex(w => w === document.activeElement);
        if (m === -1) {
          (g = c[0]) == null || g.focus();
          return;
        }
        const h = Math.max(1, Math.floor(l.current.clientWidth / 220));
        let p = -1;
        (s.key === 'ArrowRight'
          ? (p = Math.min(m + 1, c.length - 1))
          : s.key === 'ArrowLeft'
            ? (p = Math.max(m - 1, 0))
            : s.key === 'ArrowDown'
              ? (p = Math.min(m + h, c.length - 1))
              : s.key === 'ArrowUp' && (p = Math.max(m - h, 0)),
          p !== -1 && p !== m && (s.preventDefault(), c[p].focus()));
      };
      return (
        window.addEventListener('keydown', i),
        () => window.removeEventListener('keydown', i)
      );
    }, []),
    P.jsxs('div', {
      className: 'h-full flex flex-col overflow-hidden',
      style: { background: 'var(--shell-bg)', color: 'var(--glass-text)' },
      children: [
        P.jsxs('div', {
          className: 'px-8 py-5 shrink-0',
          style: { borderBottom: '1px solid var(--glass-border)' },
          children: [
            P.jsx('h1', {
              className: 'text-2xl font-black tracking-widest uppercase mb-4',
              style: { color: 'var(--glass-accent)' },
              children: '⚡ NOVA64 ARCADE',
            }),
            P.jsx('div', {
              className: 'flex gap-2 flex-wrap',
              children: Rp.map(i =>
                P.jsx(
                  'button',
                  {
                    onClick: () => t(i),
                    className:
                      'px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95',
                    style: {
                      background: e === i ? 'var(--glass-accent)' : 'var(--glass-tile)',
                      color: e === i ? '#fff' : 'var(--glass-muted)',
                      border: `1px solid ${e === i ? 'var(--glass-accent)' : 'var(--glass-border)'}`,
                      backdropFilter: 'blur(8px)',
                      cursor: 'pointer',
                    },
                    children: i,
                  },
                  i
                )
              ),
            }),
          ],
        }),
        P.jsx('div', {
          className: 'flex-1 overflow-y-auto p-8',
          children: P.jsx('div', {
            ref: l,
            className: 'grid gap-4',
            style: { gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' },
            children: o.map((i, s) =>
              P.jsxs(
                'button',
                {
                  'data-game-tile': !0,
                  tabIndex: s === 0 ? 0 : -1,
                  onClick: () => u(i),
                  onFocus: () => r(i.id),
                  onBlur: () => r(null),
                  className: 'glass-tile rounded-2xl p-5 text-left cursor-pointer',
                  style: {
                    outline: 'none',
                    boxShadow:
                      n === i.id
                        ? `var(--glass-focus-ring), 0 0 30px ${i.color}33`
                        : 'var(--glass-tile-shadow)',
                    borderColor: n === i.id ? i.color : void 0,
                  },
                  children: [
                    P.jsx('div', {
                      className: 'w-full h-1 rounded-full mb-4',
                      style: { background: `linear-gradient(90deg, ${i.color}, transparent)` },
                    }),
                    P.jsx('div', {
                      className: 'text-5xl mb-3 leading-none',
                      style: { filter: `drop-shadow(0 2px 8px ${i.color}66)` },
                      children: i.emoji,
                    }),
                    P.jsx('div', {
                      className: 'font-black text-sm tracking-wide uppercase mb-1',
                      style: { color: i.color },
                      children: i.name,
                    }),
                    P.jsx('div', {
                      className: 'text-xs leading-relaxed',
                      style: { color: 'var(--glass-muted)' },
                      children: i.description,
                    }),
                    P.jsx('div', {
                      className: 'mt-3 inline-block text-xs px-2 py-0.5 rounded-full font-medium',
                      style: {
                        background: `${i.color}22`,
                        color: i.color,
                        border: `1px solid ${i.color}44`,
                      },
                      children: i.category,
                    }),
                  ],
                },
                i.id
              )
            ),
          }),
        }),
      ],
    })
  );
}
const Dp = {
  id: 'game-launcher',
  name: 'Game Launcher',
  icon: '🎮',
  category: 'Entertainment',
  description: 'Browse and launch Nova64 games',
  mount(e, t) {
    const n = hc(e);
    (n.render(P.jsx(Op, {})), (e._tvRoot = n));
  },
  unmount() {},
  getInfo() {
    return {
      name: 'Game Launcher',
      version: '1.0',
      description: 'Browse and launch Nova64 games',
      author: 'Nova64 OS',
      icon: '🎮',
    };
  },
};
tr.registerApp(Dp);
Jl.createRoot(document.getElementById('root')).render(
  P.jsx(ds.StrictMode, { children: P.jsx(jp, {}) })
);
//# sourceMappingURL=index-DPVgMl6x.js.map
