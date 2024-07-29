import { ChildProcess, spawn } from 'child_process';
import task from 'tasuku';
import { red } from 'kolorist';

const args = process.argv.slice(2);

let n = Infinity;
if (args[0]?.match(/^-n=\d+$/)) {
  n = Number(args[0].replace('-n=', ''));
  args.splice(0, 1);
}
const name = args.join(' ');
const command = [...args];

const fTime = (t: number) => `${(t / 1000).toFixed(3)}s`;

task('', async ({ setTitle, setStatus, setOutput }) => {
  setStatus(name);

  let i = 0,
    start = performance.now(),
    times = 0,
    succ = 0,
    fail = 0;
  const errors = new Set<string>();

  const update = () => {
    setTitle([`Running iteration ${i + 1}`, n === Infinity ? '' : `/${n}`, ', ', fTime(performance.now() - start)].join(''));

    const output = [`Successful: ${Math.round((succ / i) * 100)}%`, ` (${succ}:${fail})`, `, `, `average time: ${fTime(times / i)}`];

    for (const error of errors) {
      let oneliner = error.trim().replace(/\n/g, ' ');
      if (oneliner.length > 30) {
        oneliner = oneliner.slice(0, 30) + '...';
      }
      output.push(red(`\n  error: ${oneliner}`));
    }

    if (i > 0) {
      setOutput(output.join(''));
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
    }),
  );

  console.log(process.env.SHELL);

  for (; i < n; i++) {
    start = performance.now();
    let combinedOutput = '';

    const p = spawn(command[0]!, command.slice(1), {
      shell: process.env.SHELL || true,
    });

    p.stdout?.setEncoding('utf8').on('data', (data) => {
      combinedOutput += data;
    });

    p.stderr?.setEncoding('utf8').on('data', (data) => {
      combinedOutput += data;
    });

    const { code } = await new Promise<{ code: number }>((resolve) => {
      p.on('exit', (code) => {
        resolve({ code: code || 0 });
      });
    });

    if (code === 0) {
      succ++;
    } else {
      fail++;
      if (combinedOutput) {
        errors.add(combinedOutput);
      }
    }

    if (killed) {
      break;
    }

    times += performance.now() - start;
  }

  finish();
});
