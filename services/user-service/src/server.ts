import "dotenv/config";

import app from "./app.js";
import {
  connectDatabase,
  disconnectDatabase,
} from "./config/database.js";

const PORT = Number(process.env.PORT) || 4001;

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();

    const server = app.listen(PORT, () => {
      console.log(`User service running on port ${PORT}`);
    });

    const shutdown = async (signal: string): Promise<void> => {
      console.log(`${signal} received. Shutting down...`);

      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on("SIGINT", () => {
      void shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
  } catch (error) {
    console.error("Failed to start user service:", error);
    process.exit(1);
  }
}

void bootstrap();