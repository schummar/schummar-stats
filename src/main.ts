import { ChildProcess, exec } from 'child_process';
import task from 'tasuku';

const args = process.argv.slice(2);

let n = Infinity;
if (args[0]?.match(/^-n=\d+$/)) {
  n = Number(args[0].replace('-n=', ''));
  args.splice(0, 1);
}
const command = args.join(' ');

const fTime = (t: number) => `${(t / 1000).toFixed(3)}s`;

task('', async ({ setTitle, setStatus, setOutput }) => {
  setStatus(command);

  let i = 0,
    start = performance.now(),
    times = 0,
    succ = 0,
    fail = 0;

  const update = () => {
    setTitle([`Running iteration ${i + 1}`, n === Infinity ? '' : `/${n}`, ', ', fTime(performance.now() - start)].join(''));

    if (i > 0) {
      setOutput([`Successful: ${Math.round((succ / i) * 100)}%`, ` (${succ}:${fail})`, `, `, `average time: ${fTime(times / i)}`].join(''));
    }
  };
  update();
  const interval = setInterval(update, 1000);

  const finish = () => {
    clearInterval(interval);
    update();
    setTitle(`Finished ${i} iterations, total time ${fTime(times)}`);
  };

  let childProcess: ChildProcess | undefined;
  let killed = false;

  ['SIGHUP', 'SIGINT', 'SIGTERM'].forEach((signal: any) =>
    process.on(signal, () => {
      childProcess?.kill('SIGKILL');
      killed = true;
      setTimeout(() => process.exit(), 1000).unref();
    })
  );

  for (; i < n; i++) {
    start = performance.now();

    await new Promise<void>(
      (resolve) =>
        (childProcess = exec(command, (e) => {
          resolve();
          if (killed) return;
          if (e) fail++;
          else succ++;
        }))
    );

    if (killed) {
      break;
    }

    times += performance.now() - start;
  }

  finish();
});
