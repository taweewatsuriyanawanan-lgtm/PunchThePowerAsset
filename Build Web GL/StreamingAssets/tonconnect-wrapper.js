<!DOCTYPE html>
<html lang="en-us">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>Unity WebGL Player | PunchThePowerAsset</title>
    <link rel="shortcut icon" href="TemplateData/favicon.ico">
    <link rel="stylesheet" href="TemplateData/style.css">
    <!-- ✅ TonConnect Wrapper -->
    <script src="tonconnect-wrapper.js"></script>
  </head>
  <body>
    <div id="unity-container" class="unity-desktop">
      <canvas id="unity-canvas" width=960 height=600 tabindex="-1"></canvas>
      <div id="unity-loading-bar">
        <div id="unity-logo"></div>
        <div id="unity-progress-bar-empty">
          <div id="unity-progress-bar-full"></div>
        </div>
      </div>
      <div id="unity-warning"> </div>
      <div id="unity-footer">
        <div id="unity-webgl-logo"></div>
        <div id="unity-fullscreen-button"></div>
        <div id="unity-build-title">PunchThePowerAsset</div>
      </div>
    </div>
    <script>
      var container = document.querySelector("#unity-container");
      var canvas = document.querySelector("#unity-canvas");
      var loadingBar = document.querySelector("#unity-loading-bar");
      var progressBarFull = document.querySelector("#unity-progress-bar-full");
      var fullscreenButton = document.querySelector("#unity-fullscreen-button");
      var warningBanner = document.querySelector("#unity-warning");
      function unityShowBanner(msg, type) {
        function updateBannerVisibility() {
          warningBanner.style.display = warningBanner.children.length ? 'block' : 'none';
        }
        var div = document.createElement('div');
        div.innerHTML = msg;
        warningBanner.appendChild(div);
        if (type == 'error') div.style = 'background: red; padding: 10px;';
        else {
          if (type == 'warning') div.style = 'background: yellow; padding: 10px;';
          setTimeout(function() {
            warningBanner.removeChild(div);
            updateBannerVisibility();
          }, 5000);
        }
        updateBannerVisibility();
      }
      var buildUrl = "Build";
      var loaderUrl = buildUrl + "/Buide.loader.js";
      var config = {
        dataUrl: buildUrl + "/Buide.data.br",
        frameworkUrl: buildUrl + "/Buide.framework.js.br",
        codeUrl: buildUrl + "/Buide.wasm.br",
        streamingAssetsUrl: "StreamingAssets",
        companyName: "DefaultCompany",
        productName: "PunchThePowerAsset",
        productVersion: "1.0",
        showBanner: unityShowBanner,
      };
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        var meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, height=device-height, initial-scale=1.0, user-scalable=no, shrink-to-fit=yes';
        document.getElementsByTagName('head')[0].appendChild(meta);
        container.className = "unity-mobile";
        canvas.className = "unity-mobile";
      } else {
        canvas.style.width = "960px";
        canvas.style.height = "600px";
      }
      loadingBar.style.display = "block";
      var script = document.createElement("script");
      script.src = loaderUrl;
      script.onload = () => {
        createUnityInstance(canvas, config, (progress) => {
          progressBarFull.style.width = 100 * progress + "%";
        }).then((unityInstance) => {
          window.unityInstance = unityInstance;
          loadingBar.style.display = "none";
          fullscreenButton.onclick = () => {
            unityInstance.SetFullscreen(1);
          };
        }).catch((message) => {
          alert(message);
        });
      };
      document.body.appendChild(script);
    </script>
  </body>
</html>// tonconnect-wrapper.js
(function () {
  const SDK_URL = "https://unpkg.com/@tonconnect/sdk@latest/dist/tonconnect-sdk.min.js";
  const UNITY_OBJ = "TonConnector";

  function loadSdk(callback) {
    if (window.TonConnect || window.tonConnectSdkLoaded) {
      callback();
      return;
    }
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.onload = function () { window.tonConnectSdkLoaded = true; callback(); };
    s.onerror = function () { console.error("Failed to load TonConnect SDK"); callback(); };
    document.head.appendChild(s);
  }

  function safeSend(method, payload) {
    try {
      if (window.unityInstance && typeof window.unityInstance.SendMessage === "function") {
        window.unityInstance.SendMessage(UNITY_OBJ, method, payload || "");
      } else {
        console.warn("unityInstance not ready for", method, payload);
      }
    } catch (e) {
      console.error("SendMessage error", e);
    }
  }

  window._tonWrapper = {
    connector: null,
    manifestUrl: null
  };

  window.TonConnectInit = function (manifestUrl) {
    loadSdk(function () {
      if (typeof TonConnect === "undefined" && typeof window.TonConnect === "undefined") {
        console.error("TonConnect SDK not available after load.");
        return;
      }
      const TonConnectClass = window.TonConnect || TonConnect;
      try {
        window._tonWrapper.connector = new TonConnectClass({ manifestUrl: manifestUrl });
        window._tonWrapper.manifestUrl = manifestUrl;
        console.log("TonWrapper: initialized with ", manifestUrl);
      } catch (e) {
        console.error("TonWrapper: instantiate error", e);
        return;
      }

      try {
        if (typeof window._tonWrapper.connector.onStatusChange === "function") {
          window._tonWrapper.connector.onStatusChange(function (wallet) {
            const address = wallet?.account?.address || wallet?.account || wallet?.address || "";
            if (address) {
              safeSend("OnTonConnected", address);
            } else {
              safeSend("OnTonDisconnected", "");
            }
          });
        } else if (typeof window._tonWrapper.connector.on === "function") {
          window._tonWrapper.connector.on("statusChanged", function (wallet) {
            const address = wallet?.account?.address || wallet?.account || wallet?.address || "";
            if (address) safeSend("OnTonConnected", address); else safeSend("OnTonDisconnected", "");
          });
        }
      } catch (e) {
        console.warn("TonWrapper: status binding failed", e);
      }
    });
  };

  window.TonConnectOpenModal = function () {
    if (!window._tonWrapper.connector) {
      console.error("TonWrapper: connector not initialized");
      return;
    }
    try {
      const connector = window._tonWrapper.connector;
      if (typeof connector.connect === "function") {
        connector.connect().then(result => {
          const address = result?.account?.address || result?.account || result?.address || "";
          if (address) safeSend("OnTonConnected", address);
        }).catch(err => {
          console.error("connect() error", err);
          safeSend("OnTonTransactionFailure", (err && err.message) ? err.message : JSON.stringify(err));
        });
      } else if (typeof connector.connectWallet === "function") {
        connector.connectWallet().then(res => {
          const address = res?.account?.address || res?.account || res?.address || "";
          if (address) safeSend("OnTonConnected", address);
        }).catch(err => {
          console.error("connectWallet() error", err);
          safeSend("OnTonTransactionFailure", (err && err.message) ? err.message : JSON.stringify(err));
        });
      }
    } catch (e) {
      console.error("TonWrapper open modal error", e);
    }
  };

  window.TonConnectSendTransaction = function (txJson) {
    if (!window._tonWrapper.connector) {
      console.error("TonWrapper: connector not initialized");
      return;
    }
    let tx;
    try { tx = JSON.parse(txJson); } catch (e) { console.error("Invalid tx JSON", e); return; }
    try {
      const connector = window._tonWrapper.connector;
      if (typeof connector.sendTransaction === "function") {
        connector.sendTransaction(tx).then(res => {
          const boc = res?.boc || JSON.stringify(res);
          safeSend("OnTonTransactionSuccess", boc);
        }).catch(err => {
          console.error("sendTransaction error", err);
          safeSend("OnTonTransactionFailure", (err && err.message) ? err.message : JSON.stringify(err));
        });
      }
    } catch (e) {
      console.error("TonWrapper send error", e);
    }
  };

  window.TonConnectDisconnect = function () {
    try {
      if (window._tonWrapper.connector && typeof window._tonWrapper.connector.disconnect === "function") {
        window._tonWrapper.connector.disconnect();
      }
    } catch (e) { console.warn(e); }
    safeSend("OnTonDisconnected", "");
  };

  window.TonConnectRequestTokenBalance = function (token) {
    console.warn("TonWrapperRequestTokenBalance called for", token);
    if (window.unityInstance && typeof window.unityInstance.SendMessage === "function") {
      window.unityInstance.SendMessage("TonConnector", "OnTokenBalanceResult", token + "|0");
    }
  };
})();
