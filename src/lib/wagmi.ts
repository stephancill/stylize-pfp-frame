import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";

export const config = createConfig({
  chains: [base as any],
  transports: {
    [base.id]: http(),
  },
});
