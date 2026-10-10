// Registers the guide's strings once; js/ui/coreloop/guide.js and feedback.js both need them.
import { registerStrings } from './index.js';
import EN from './guide.en.js';
import AR from './guide.ar.js';

registerStrings(EN, AR);
