import { exec } from 'child_process'

interface Pos {
  row: number
  col: number 
}
export default (): Promise<Pos> => new Promise((res, rej) => {
  exec([
    'exec < /dev/tty',
    'oldstty=$(stty -g)',
    'stty raw -echo min 0',
    'echo -en "\\033[6n" > /dev/tty',
    'IFS=\';\' read -r -d R -a pos',
    'stty $oldstty',
    'row=$((${pos[0]:2} - 1))',
    'col=$((${pos[1]} - 1))',
    'echo \\{\\"row\\":$row,\\"col\\":$col\\}',
  ].join(' && '),
  { shell: '/bin/bash' },
  (err, stdout, stderr) => {
    if (err)
      return rej(err)

    return res(JSON.parse(stdout || stderr))
  })
})