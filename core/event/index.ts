const eventManager = new globalThis.EventManager();
import * as  errsole from 'npm:errsole';
import * as  ErrsoleSQLite from 'npm:errsole-sqlite';

// errsole.initialize({
// 	storage: new ErrsoleSQLite('./logs.sqlite')
//   });

console.log('event manager running');

for await (const data of eventManager) {
	if (data) {
		switch (data.event_type) {
			case 'Log':
				if (data.event.level === 'Error') {
					console.error(data.event.msg);
				} else {
					//console.log(data.event.msg);
					console.dir(data.event.msg, { depth: Infinity });
				}
				break;
			default:
				console.dir(data, { depth: Infinity });
		}
	}
}