
  
const function_path2 = `${Deno.cwd()}`
console.log(function_path2)
const trex = `${Deno.cwd()}/${Deno.args[0]}/trex`

async function build(fn) {
    return await Promise.all(fn.map(async f => { 
        if(f.function) {
        const path = `${function_path2}${f.function}/index.ts`
        const out = `${function_path2}${f.function}/index.eszip`
        f.eszip = `${f.function}/index.eszip`
        var _args = ["bundle", "--entrypoint", path, "--output", out, "--decorator", "typescript_with_metadata"]
        if (f.imports) {
            const f_imports = `file://${function_path2}${f.imports}`;
            _args = _args.concat(["--import-map", `${function_path2}${f.imports}`])
            f.imports = f_imports;
        }
        let cmd = new Deno.Command(trex, { args:  _args});
        let { code, stdout, stderr } = await cmd.output();
        console.log(trex + " " + _args.join(" "))

        if(code != 0) {
            console.log(f);
            console.log(_args)
            console.log(new TextDecoder().decode(stdout));
            console.error(new TextDecoder().decode(stderr));
        }
        
        
    }
    return f}))
}

const pkg = JSON.parse(Deno.readTextFileSync(`${function_path2}/package.org.json`));
const x = await build(pkg.trex.functions.api);
const y = await build(pkg.trex.functions.init);
pkg.trex.functions.api = x
pkg.trex.functions.init = y
Deno.writeTextFileSync(`${function_path2}/package.json`, JSON.stringify(pkg, null, 2));
