import util from 'util';
import sglob from 'glob';

const glob = util.promisify(sglob);

export default glob;
