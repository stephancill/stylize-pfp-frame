import { initExpressApp } from "../lib/bullboard";

export { notificationsBulkWorker } from "./notifications";
export { stylizeImageWorker } from "./stylize";

// Run bull board
initExpressApp();
