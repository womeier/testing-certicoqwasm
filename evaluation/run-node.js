import { print_i63, print_compare, print_bool, print_nat_sexp, print_nat_notation, print_list_sexp, print_list_notation, print_option, print_prod, print_positive_sexp, print_N_sexp, print_Z_sexp, print_compcert_byte_sexp } from './pp.js';

const pp_map = {
    "demo1": (val, dataView) => print_list_sexp(val, dataView, print_bool),
    "demo2": (val, dataView) => print_list_sexp(val, dataView, print_bool),
    "list_sum": print_nat_sexp,
    "vs_easy": print_bool,
    "vs_hard": print_bool,
    "binom": print_nat_sexp,
    "color": (val, dataView) => print_prod(val, dataView, print_Z_sexp, print_Z_sexp),
    "sha_fast": (val, dataView) => print_list_sexp(val, dataView, print_compcert_byte_sexp),
    "ack_3_9": print_nat_sexp,
    "even_10000": print_bool,
    "bernstein_yang": print_Z_sexp,
    "sm_gauss_nat": (val, dataView) => print_option(val, dataView, print_nat_sexp),
    "sm_gauss_N": (val, dataView) => print_option(val, dataView, print_N_sexp),
    "sm_gauss_PrimInt": (val, dataView) => print_option(val, dataView, print_i63),
    "addition_primitive": print_bool,
    "addition_primitive_overflow": print_bool,
    "subtraction_primitive": print_bool,
    "subtraction_primitive_underflow": print_bool,
    "multiplication_primitive": print_bool,
    "multiplication_primitive_overflow": print_bool,
    "division_primitive": print_bool,
    "division_primitive_0": print_bool,
    "land_primitive": print_bool,
    "lor_primitive": print_bool,
    "lsl_primitive": print_bool,
    "lsr_primitive": print_bool,
    "eqb_true_primitive": print_bool,
    "eqb_false_primitive": print_bool,
};

import * as fs from 'fs';

var args = process.argv.slice(2);
if (args.length != 2) {
    console.log("Expected two args: 0: path to folder containing wasm file to run, 1: program.");
    console.log("e.g.: $ node --experimental-wasm-return_call run-node.js ./binaries/cps-0aryfast-feb-13-24 vs_easy");
    process.exit(1);
}
var path = args[0];
if (path.charAt(path.length - 1) != "/") { path = path + "/" }

var program = args[1];

function write_int (value) {
    process.stdout.write(value.toString())
}

function write_char (value) {
    var chr = String.fromCharCode(value);
    process.stdout.write(chr);
}

let importObject = {
    env: {
        write_char: write_char,
        write_int: write_int,
    }
};

(async () => {
    const start_startup = Date.now();
    const bytes = fs.readFileSync(path + `CertiCoq.Benchmarks.tests.${program}.wasm`);

    const obj = await WebAssembly.instantiate(
        new Uint8Array (bytes), importObject
    );
    const stop_startup = Date.now();
    const time_startup = stop_startup - start_startup;

    try {
        const start_main = Date.now();
        obj.instance.exports.main_function();
        const stop_main = Date.now();
        const time_main = stop_main - start_main;

        let bytes = obj.instance.exports.bytes_used.value;
        let time_pp = undefined;

        if (obj.instance.exports.result_out_of_mem.value == 1) {
            console.log("Ran out of memory.");
            console.log(`Benchmark ${path}: {{"time_startup": "${time_startup}", "time_main": "${time_main}", "program": "${program}"}} (in ms)`);
            process.exit(1);
        } else {
            const res_value = obj.instance.exports.result.value;
            process.stdout.write("====> ");

            // with the new constructor representation, modules don't contain a generated pp function anymore
            let fn_pp = obj.instance.exports.pretty_print_constructor;
            if (fn_pp == undefined) {
                fn_pp = pp_map[program.split("-opt")[0]];
                if (fn_pp == undefined) {
                    console.log(`Please specify pp functions for ${program} in run-node.js.`);
                    process.exit(1);
                }

                const memory = obj.instance.exports.memory;
                const dataView = new DataView(memory.buffer);
                const res_value = obj.instance.exports.result.value;

                const start_pp = Date.now();
                fn_pp(res_value, dataView);
                const stop_pp = Date.now();
                time_pp = stop_pp - start_pp;

            } else {
                const start_pp = Date.now();
                obj.instance.exports.pretty_print_constructor(res_value);
                const stop_pp = Date.now();
                time_pp = stop_pp - start_pp;
            }
        }
        console.log(`\nBenchmark ${path}: {{"time_startup": "${time_startup}", "time_main": "${time_main}", "time_pp": "${time_pp}", "bytes_used": "${bytes}", "program": "${program}"}} ms, bytes.`);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
})();
