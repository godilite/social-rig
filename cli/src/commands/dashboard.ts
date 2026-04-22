import { Command } from "commander"

export const dashboardCommand = new Command("dashboard")
  .description("Start the localhost web dashboard")
  .option("-p, --port <port>", "Port to run the dashboard on", "3847")
  .option("--no-open", "Do not open browser automatically")
  .action(async (options: { port: string; open: boolean }) => {
    const { startDashboard } = await import("../dashboard/server.js")
    await startDashboard({
      port: parseInt(options.port, 10),
      openBrowser: options.open,
    })
  })
