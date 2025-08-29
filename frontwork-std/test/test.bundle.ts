import { frontwork_bundler } from '../frontwork-bundler.ts';
import { APP_CONFIG } from './test.routes.ts';


await frontwork_bundler(APP_CONFIG, ["test/test.client.ts"], "test/dist/js/");
