"use strict";
    Reconnect: -1,	// reconnect state
    None: 0,	// not initialized
    WaitAuth: 1,	// waiting session id
    Authorized: 2,	// authorized
    ClosedCoAuth: 3,	// closed coauthoring
    ClosedAll: 4,	// closed all

    SaveChanges: 10		// save
  };

  /*
  window['AscCommon'] = window['AscCommon'] || {};
  window["AscCommon"].asc_CUser = asc_CUser;
  prot = asc_CUser.prototype;
  window["AscCommon"].ConnectionState = ConnectionState;
})(window);