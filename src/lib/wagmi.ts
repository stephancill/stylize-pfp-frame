import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { baseAccountConnector } from "@base-org/account";

export const config = createConfig({
  connectors: [
    baseAccountConnector({
      appName: "Stylize Me",
      appLogoUrl: "https://stylize.steer.fun/splash.png",
    }),
  ],
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});
