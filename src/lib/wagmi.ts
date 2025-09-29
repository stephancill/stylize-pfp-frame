import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { baseAccount } from "@wagmi/connectors";

export const config = createConfig({
  connectors: [
    baseAccount({
      appName: "Stylize Me",
      appLogoUrl: "https://stylize.steer.fun/splash.png",
    }),
  ],
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});
