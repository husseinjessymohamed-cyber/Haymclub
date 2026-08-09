import dataSource from './data-source';

async function main(): Promise<void> {
  console.log('=== HAYMCLUB MIGRATIONS START ===');

  try {
    await dataSource.initialize();

    const pending =
      await dataSource.showMigrations();

    console.log(
      `Pending migrations: ${pending ? 'YES' : 'NO'}`,
    );

    const executed =
      await dataSource.runMigrations({
        transaction: 'all',
      });

    console.log(
      `Executed migrations: ${executed.length}`,
    );

    for (const migration of executed) {
      console.log(
        `✓ ${migration.name}`,
      );
    }

    console.log(
      '=== HAYMCLUB MIGRATIONS SUCCESS ===',
    );
  } catch (error) {
    console.error(
      '=== HAYMCLUB MIGRATIONS FAILED ===',
    );

    console.error(error);

    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void main();
