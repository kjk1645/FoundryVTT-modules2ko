class Modules2ko {

	constructor() {
		this._l10nMetadata = null
	}

	get modules() {
		const modules = [];
		const settings = game.settings.get('modules2ko', 'settings');
		game.modules.forEach((module, moduleName) => {
			if (module.active && (moduleName in this._l10nMetadata)) {
				let info = this._l10nMetadata[moduleName];
				let active = !settings.hasOwnProperty(moduleName) || settings[moduleName];
				modules.push({
					name: moduleName,
					title: module.data.title,
					translator: info.translators.join(', '),
					moduleVersion: module.data.version,
					translationVersion: info.version,
					isOutdated: isNewerVersion(module.data.version, info.version),
					isPredated: isNewerVersion(info.version, module.data.version),
					active: active
				});
			}
		});
		return modules;
	}

	async _loadJsonObject(src) {
		const resp = await fetch(src);
		if ( resp.status !== 200 ) {
			console.warn(`modules2ko | 요청한 JSON 파일 ${src} 를 불러올 수 없습니다.`);
			return {};
		}
		return resp.json().then(json => {
			console.log(`modules2ko | JSON 파일 ${src} 를 불러왔습니다.`);
			return json;
		}).catch(err => {
			console.error(`modules2ko | JSON 파일 ${src} 를 파싱할 수 없습니다: ${err}`);
			return {};
		});
	}

	async loadTranslations() {
		this._l10nMetadata = await this._loadJsonObject('modules/modules2ko/metadata.json');
		const promises = [];
		const settings = game.settings.get('modules2ko', 'settings');
		game.modules.forEach((module, moduleName) => {
			if (module.active && (moduleName in this._l10nMetadata)) {
				let active = !settings.hasOwnProperty(moduleName) || settings[moduleName];
				if (active) promises.push(this._loadJsonObject(`modules/modules2ko/localizations/${moduleName}.json`));
			}
		});
		let translations;
		await Promise.all(promises).then((values) => {
			translations = values;
		});
		return translations;
	}

	applyTranslations(translations) {
		for (let t of translations) {
			mergeObject(game.i18n.translations, t, {inplace: true});
		}
	}
}

const modules2koSetupPromise = new Promise((resolve, reject) => {
	Hooks.once('setup', () => resolve());
});

Hooks.once('init', async () => {
	game.modules2ko = new Modules2ko();

	game.settings.register("modules2ko", "settings", {
		name: "modules2ko Settings",
		scope: "client",
		default: {},
		type: Object,
		config: false,
		onChange: settings => window.location.reload()
	});

	await Promise.all([game.modules2ko.loadTranslations(), modules2koSetupPromise]).then(values => {
		game.modules2ko.applyTranslations(values[0]);
	});

	game.settings.registerMenu("modules2ko", "modules2ko", {
		name: "modules2ko.config",
		label: "modules2ko.config-button-label",
		hint: "modules2ko.config-hint",
		icon: "fas fa-language",
		type: Modules2KoConfig,
		restricted: false
	});
});

class Modules2KoConfig extends FormApplication {

	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			title: game.i18n.localize("modules2ko.config"),
			id: "modules2ko-config",
			template: "modules/modules2ko/templates/modules2ko-config.html",
			popOut: true,
			width: 600,
			height: "auto"
		})
	}

	getData(options) {
		return {
			canConfigure: true,
			modules: game.modules2ko.modules
		}
	}

	async _updateObject(event, formData) {
		const settings = await game.settings.get('modules2ko', 'settings');
		const settingsNew = mergeObject(settings, formData);
		return game.settings.set('modules2ko', 'settings', settingsNew);
	}

}
