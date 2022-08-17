import util from 'util';
import srimraf from 'rimraf';

const rimraf = util.promisify(srimraf);

export default rimraf;
