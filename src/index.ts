import cli from "./cli";
import NGMApi from "./api";

if (module === require.main) {
  module.exports = cli()
} else {
  module.exports = NGMApi
}
