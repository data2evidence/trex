import { core, primordials } from "ext:core/mod.js";

import { MAIN_WORKER_API, USER_WORKER_API } from "ext:sb_ai/js/ai.js";
import { SUPABASE_USER_WORKERS } from "ext:sb_user_workers/user_workers.js";
import { applySupabaseTag } from "ext:sb_core_main_js/js/http.js";
import { waitUntil } from "ext:sb_core_main_js/js/async_hook.js";
import { op_add_replication, PluginManager, TrexDB } from "ext:sb_trex/js/trex_lib.js";

const ops = core.ops;
const { ObjectDefineProperty } = primordials;

/**
 * @param {"user" | "main" | "event"} kind 
 * @param {number} terminationRequestTokenRid 
 */
function installEdgeRuntimeNamespace(kind, terminationRequestTokenRid) {
	let props = {
		scheduleTermination: () => ops.op_cancel_drop_token(terminationRequestTokenRid)
	};

	switch (kind) {
		case "main":
			props = {
				ai: MAIN_WORKER_API,
				userWorkers: SUPABASE_USER_WORKERS,
				getRuntimeMetrics: () => /* async */ ops.op_runtime_metrics(),
				applySupabaseTag: (src, dest) => applySupabaseTag(src, dest),
				systemMemoryInfo: () => ops.op_system_memory_info(),
				raiseSegfault: () => ops.op_raise_segfault(),
				...props,
			};
			break;

		case "event":
			props = {
				...props
			};
			break;

		case "user":
			props = {
				waitUntil
			};
			break;
	}

	if (props === void 0) {
		return;
	}

	ObjectDefineProperty(globalThis, "EdgeRuntime", {
		get() {
			return props;
		},
		configurable: true,
	});

	/** TREX */

	let propsTrex = {
		scheduleTermination: () => ops.op_cancel_drop_token(terminationRequestTokenRid)
	};

	switch (kind) {
		case "main":
			propsTrex = {
				ai: MAIN_WORKER_API,
				userWorkers: SUPABASE_USER_WORKERS,
				getRuntimeMetrics: () => /* async */ ops.op_runtime_metrics(),
				applySupabaseTag: (src, dest) => applySupabaseTag(src, dest),
				systemMemoryInfo: () => ops.op_system_memory_info(),
				raiseSegfault: () => ops.op_raise_segfault(),
				PluginManager: PluginManager,
				TrexDB: TrexDB,
				addReplication: op_add_replication,
				addDB: op_add_replication,
				...propsTrex,
			};
			break;

		case "event":
			propsTrex = {
				...propsTrex
			};
			break;

		case "user":
			propsTrex = {
				waitUntil,
				TrexDB: TrexDB,
			};
			break;
	}

	if (propsTrex === void 0) {
		return;
	}

	ObjectDefineProperty(globalThis, "Trex", {
		get() {
			return propsTrex;
		},
		configurable: true,
	});
}

/**
 * @param {"user" | "main" | "event"} kind 
 */
function installSupabaseNamespace(kind) {
  const props = {
    ai: USER_WORKER_API
  };

  ObjectDefineProperty(globalThis, "Supabase", {
    get() {
      return props;
    },
    configurable: true,
  });
}

export {
	installEdgeRuntimeNamespace,
	installSupabaseNamespace,
}
