import * as runtimeDom from '@vue/runtime-dom';
import { initCustomFormatter, warn, registerRuntimeCompiler } from '@vue/runtime-dom';
export * from '@vue/runtime-dom';
import { compile } from '@vue/compiler-dom';
import { isString, NOOP, extend, generateCodeFrame } from '@vue/shared';

function initDev() {
    {
        initCustomFormatter();
    }
}

// This entry is the "full-build" that includes both the runtime
if ((process.env.NODE_ENV !== 'production')) {
    initDev();
}
const compileCache = Object.create(null);
function compileToFunction(template, options) {
    
    let isOnError = false; // FIV5S_CHANGES
    let errorDesc = ''; // FIV5S_CHANGES
    let codeFrame = ''; // FIV5S_CHANGES


    if (!isString(template)) {
        if (template.nodeType) {
            template = template.innerHTML;
        }
        else {
            (process.env.NODE_ENV !== 'production') && warn(`invalid template option: `, template);
            return NOOP;
        }
    }
    const key = template;
    const cached = compileCache[key];
    
    if (cached) {
        return cached;
    }
    if (template[0] === '#') {
        const el = document.querySelector(template);
        if ((process.env.NODE_ENV !== 'production') && !el) {
            warn(`Template element not found or is empty: ${template}`);
        }
        // __UNSAFE__
        // Reason: potential execution of JS expressions in in-DOM template.
        // The user must make sure the in-DOM template is trusted. If it's rendered
        // by the server, the template should not contain any user data.
        template = el ? el.innerHTML : ``;
    }

     // FIV5S_CHANGES
    let { code } = compile(template, extend({
        hoistStatic: true,
        onError: (process.env.NODE_ENV !== 'production') ? onError : undefined,
        onWarn: (process.env.NODE_ENV !== 'production') ? e => onError(e, true) : NOOP
    }, options));

    function onError(err, asWarning = false) {
        isOnError = true;
        
        const message = asWarning
            ? err.message
            : `Template compilation error: ${err.message}`;
        codeFrame = err.loc &&
            generateCodeFrame(template, err.loc.start.offset, err.loc.end.offset);

        errorDesc = message;
        warn(codeFrame ? `${message}\n${codeFrame}` : message);
    }
    // The wildcard import results in a huge object with every export
    // with keys that cannot be mangled, and can be quite heavy size-wise.
    // In the global build we know `Vue` is available globally so we can avoid
    // the wildcard object.


    // FIV5S CHANGES: 
    // If template is not valid, return "Invalid template" block instead of
    // rendering the invalid code block.

    const getErrorHTMLCode = (customMessage) => {
        let errorBlockMsg = (!!customMessage) ?  customMessage: ``
        errorBlockMsg = `ESTORE:: Invalid Template! 
${errorDesc}
${customMessage}`
  
        return `const _Vue = Vue

        return function render(_ctx, _cache) {
        with (_ctx) {
            const { openBlock: _openBlock, createElementBlock: _createElementBlock } = _Vue
        
            return (_openBlock(), _createElementBlock("div", {style:"color: #e37d5d; font-family: monospace; text-align: left; white-space: pre-wrap;"}, \`${errorBlockMsg}\`))
        }
        }`;
    }

    if(isOnError){
        code = getErrorHTMLCode(codeFrame)
    }
    
    let render;
    try{
        //console.log(code)
        render = (new Function('Vue', code)(runtimeDom));
    }catch{
        render = (new Function('Vue', getErrorHTMLCode('ESTORE:: Unknown Template Error'))(runtimeDom));
    }
    
    render._rc = true;
    let returnData = (compileCache[key] = render)
    
    return returnData;
}
registerRuntimeCompiler(compileToFunction);

export { compileToFunction as compile };
