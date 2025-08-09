import { Wallet, providers, utils, BigNumber } from 'ethers';
import yargs from 'yargs';
import { createProvider } from './providerManager';
import { sendWithRetry } from './retry';
import { startTelemetryServer } from './telemetry';
import { createFlashbotsProvider } from './flashbots';

const argv = yargs(process.argv.slice(2))
  .option('ws', { type: 'string', demandOption: true, describe: 'WebSocket RPC URL' })
  .option('http', { type: 'string', demandOption: true, describe: 'HTTP RPC fallback URL' })
  .option('pk', { type: 'string', demandOption: true, describe: 'Private key wallet' })
  .option('target', { type: 'string', demandOption: true, describe: 'Target contract address' })
  .option('mintSelector', { type: 'string', default: '0x1249c58b', describe: 'Mint function selector' })
  .option('retries', { type: 'number', default: 5, describe: 'Max retries on mint failure' })
  .option('gasBumpPercent', { type: 'number', default: 10, describe: 'Gas bump percent per retry' })
  .option('manualNonce', { type: 'number', describe: 'Manual nonce override' })
  .option('useFlashbots', { type: 'boolean', default: false, describe: 'Use Flashbots relay' })
  .argv;

async function main() {
  startTelemetryServer();

  const provider = createProvider(argv.ws, argv.http);
  const wallet = new Wallet(argv.pk, provider);

  let flashbots;
  if (argv.useFlashbots) {
    flashbots = await createFlashbotsProvider(wallet, provider);
    console.log('🚀 Flashbots relay aktif');
  }

  provider.on('pending', async (txHash: string) => {
    try {
      const tx = await provider.getTransaction(txHash);
      if (!tx?.to || tx.to.toLowerCase() !== argv.target.toLowerCase()) return;
      if (!tx.data.startsWith(argv.mintSelector)) return;

      console.log(`🔍 TX mint terdeteksi: ${txHash}`);

      const template = {
        to: tx.to,
        data: tx.data,
        gasLimit: BigNumber.from(300000),
        gasPrice: tx.gasPrice ?? utils.parseUnits('30', 'gwei'),
      };

      if (argv.useFlashbots && flashbots) {
        const bundle = [
          {
            signer: wallet,
            transaction: {
              ...template,
              nonce: argv.manualNonce ?? await wallet.getNonce(),
            },
          },
        ];
        const blockNumber = await provider.getBlockNumber();
        const res = await flashbots.sendBundle(bundle, blockNumber + 1);
        console.log(`📦 Flashbots bundle dikirim: ${res.bundleHash}`);
      } else {
        await sendWithRetry(
          wallet,
          template,
          argv.retries,
          argv.gasBumpPercent,
          argv.manualNonce
        );
      }
    } catch (err: any) {
      console.error(`⚠️ Gagal proses TX ${txHash}: ${err.message}`);
    }
  });
}

main();