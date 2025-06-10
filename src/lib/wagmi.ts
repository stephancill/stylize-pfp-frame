import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { injected, coinbaseWallet } from "@wagmi/connectors";

export const config = createConfig({
  connectors: [
    coinbaseWallet({
      appName: "Stylize Me",
      appLogoUrl: "https://stylize.steer.fun/splash.png",
    }),
  ],
  chains: [base as any],
  transports: {
    [base.id]: http(),
  },
});
