// Injected wallet (MetaMask) on window.ethereum: the DOM lib doesn't
// declare it, and ethers v6's Eip1193Provider only covers `request` — the
// app also subscribes to the provider's accountsChanged / chainChanged
// events in Web3Context, so the event-emitter side is declared here too.
import type { Eip1193Provider } from 'ethers';

export interface WindowEthereumProvider extends Eip1193Provider {
  on(event: 'accountsChanged', listener: (accounts: string[]) => void): void;
  on(event: 'chainChanged', listener: (chainId: string) => void): void;
  on(event: 'connect', listener: (info: { chainId: string }) => void): void;
  on(event: 'disconnect', listener: (error: Error) => void): void;
  on(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: WindowEthereumProvider;
  }
}
