import { CommandFn } from ".";
import displayProcess from "../utils/display-process";

const test_command: CommandFn = async () => {

  displayProcess(...(Array.from({ length: 10 }).map((_v, i) => ({ label: `${i}`, promise: new Promise((res) => setTimeout(res, Math.random() * 10000)) }))))

}
export default test_command