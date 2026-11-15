/**
 * Wallet playground, step 2: a scripted browser wallet for a local fork. Paste this into the browser console on
 * the running Netteo app (or run it with a browser tool), then press "Connect Wallet".
 *
 * It announces itself with EIP-6963, so Netteo's wagmi `injected()` connector discovers it like any real wallet.
 * Requests are forwarded to the local anvil fork, whose first dev account can sign. It cannot reach the real chain:
 * if the fork is not running, every request simply fails.
 *
 * Only for local testing. anvil's dev key is public, so never send real funds to this address.
 */
(() => {
  const RPC = window.__WALLET_PLAYGROUND_RPC || 'http://127.0.0.1:8547';
  const ACCOUNT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const listeners = {};
  let nextId = 1;

  const call = async (method, params = []) => {
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
    });
    const body = await res.json();
    if (body.error) {
      const err = new Error(body.error.message);
      err.code = body.error.code;
      err.data = body.error.data;
      throw err;
    }
    return body.result;
  };

  const provider = {
    isNetteoTestWallet: true,
    async request({ method, params }) {
      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts':
          return [ACCOUNT];
        case 'wallet_switchEthereumChain':
        case 'wallet_addEthereumChain':
        case 'wallet_requestPermissions':
          return null;
        default:
          return call(method, params);
      }
    },
    on(event, fn) {
      (listeners[event] = listeners[event] || []).push(fn);
    },
    removeListener(event, fn) {
      listeners[event] = (listeners[event] || []).filter((f) => f !== fn);
    },
  };

  const info = {
    uuid: '6f8c1b8e-0d5b-4a8e-9d3a-4f1e7a5c2b11',
    name: 'Netteo Test Wallet',
    icon: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="8" fill="#7F011F"/></svg>'),
    rdns: 'org.netteo.testwallet',
  };

  const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: Object.freeze({ info, provider }) }));
  window.addEventListener('eip6963:requestProvider', announce);
  announce();
  window.__netteoTestWallet = { account: ACCOUNT, rpc: RPC };
  console.log('Netteo Test Wallet ready, account ' + ACCOUNT + ', RPC ' + RPC);
})();
