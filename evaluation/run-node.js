import { print_i63, print_compare, print_bool, print_bool_old_dontuse, print_nat_sexp, print_nat_notation, print_list_sexp, print_list_notation, print_option, print_prod, print_positive_sexp, print_N_sexp, print_Z_sexp, print_compcert_byte_sexp } from './pp.js';

// This script runs a wasm file generated by CertiCoq-wasm
// Usage: node run-node.js folder/ demo1

// This script is backwards compatible with some older versions of CertiCoq-wasm.
// For the reader, likely only the latest version is of interest, ../examples/certicoqwasm/sha.js should be easier to use.

var pp_map = {
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
    "coqprime": print_bool,
};

import * as fs from 'fs';

var args = process.argv.slice(2);
if (args.length != 2) {
    console.log("Expected two args: 0: path to folder containing wasm file to run, 1: program.");
    console.log("e.g.: $ node run-node.js ./binaries/non-cps-grow-mem-less-often-august-30-24 vs_easy");
    process.exit(1);
}
var path = args[0];
if (path.charAt(path.length - 1) != "/") { path = path + "/" }

var program = args[1];


// old versions before bool constructors were swapped
const old_versions = [
    "cps-feb-01-24", "cps-0aryfast-feb-13-24", "non-cps-feb-07-24", "non-cps-0aryfast-return-feb-26-24",
    "non-cps-ifs-unnested-mrch-22-24", "non-cps-grow-mem-func-mrch-24-24", "non-cps-br_if-apr-12-24",
    "non-cps-wasmgc-may-16-24", "non-cps-primops-may-21-24", "non-cps-no-imports-june-15-24",
    "cps-grow-mem-less-often-september-18-24", "non-cps-grow-mem-less-often-august-30-24"
]
const parts = path.split("/").filter((s) => s.length > 0);
const folder = parts[parts.length - 1];
if (old_versions.includes(folder)) {
    pp_map = {
        "demo1": (val, dataView) => print_list_sexp(val, dataView, print_bool_old_dontuse),
        "demo2": (val, dataView) => print_list_sexp(val, dataView, print_bool_old_dontuse),
        "list_sum": print_nat_sexp,
        "vs_easy": print_bool_old_dontuse,
        "vs_hard": print_bool_old_dontuse,
        "binom": print_nat_sexp,
        "color": (val, dataView) => print_prod(val, dataView, print_Z_sexp, print_Z_sexp),
        "sha_fast": (val, dataView) => print_list_sexp(val, dataView, print_compcert_byte_sexp),
        "ack_3_9": print_nat_sexp,
        "even_10000": print_bool_old_dontuse,
        "bernstein_yang": print_Z_sexp,
        "sm_gauss_nat": (val, dataView) => print_option(val, dataView, print_nat_sexp),
        "sm_gauss_N": (val, dataView) => print_option(val, dataView, print_N_sexp),
        "sm_gauss_PrimInt": (val, dataView) => print_option(val, dataView, print_i63),
        "addition_primitive": print_bool_old_dontuse,
        "addition_primitive_overflow": print_bool_old_dontuse,
        "subtraction_primitive": print_bool_old_dontuse,
        "subtraction_primitive_underflow": print_bool_old_dontuse,
        "multiplication_primitive": print_bool_old_dontuse,
        "multiplication_primitive_overflow": print_bool_old_dontuse,
        "division_primitive": print_bool_old_dontuse,
        "division_primitive_0": print_bool_old_dontuse,
        "land_primitive": print_bool_old_dontuse,
        "lor_primitive": print_bool_old_dontuse,
        "lsl_primitive": print_bool_old_dontuse,
        "lsr_primitive": print_bool_old_dontuse,
        "eqb_true_primitive": print_bool_old_dontuse,
        "eqb_false_primitive": print_bool_old_dontuse,
        "coqprime": print_bool_old_dontuse,
    };
}

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

        var out_of_mem = obj.instance.exports.result_out_of_mem;
        var bytes_used = obj.instance.exports.bytes_used;

        // backwards compatibility
        if (out_of_mem == undefined) {
            // variable renamed from result_out_of_mem into out_of_mem
            out_of_mem = obj.instance.exports.out_of_mem;
        }
        if (bytes_used == undefined) {
            // variable renamed from bytes_used into mem_ptr
            bytes_used = obj.instance.exports.mem_ptr;
        }

        if (bytes_used == undefined) {
            // still undefined: we got a WasmGC binary
            bytes_used = -1; // unknown mem usage: TODO ask v8
            console.log(`Benchmark ${path}: {{"time_startup": "${time_startup}", "time_main": "${time_main}", "time_pp": "0", "bytes_used": "${bytes_used}", "program": "${program}"}} ms, bytes.`);
            process.exit(0);
        }
        // constructor repr: linear memory
        bytes_used = bytes_used.value;
        out_of_mem = out_of_mem.value;

        if (out_of_mem == 1) {
            console.log("Ran out of memory.");
            console.log(`Benchmark ${path}: {{"time_startup": "${time_startup}", "time_main": "${time_main}", "program": "${program}"}} (in ms)`);
            process.exit(1);
        }

        // successful result
        const res_value = obj.instance.exports.result.value;
        process.stdout.write("====> ");

        let time_pp = undefined;
        let fn_pp = obj.instance.exports.pretty_print_constructor;
        if (fn_pp == undefined) {
            // new constructor representation (like C backend), doesn't contain automatically generated PP fn
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
            // old constructor representation (unlike C backend), contained automatically generated PP fn
            const start_pp = Date.now();
            obj.instance.exports.pretty_print_constructor(res_value);
            const stop_pp = Date.now();
            time_pp = stop_pp - start_pp;
        }
        console.log(`\nBenchmark ${path}: {{"time_startup": "${time_startup}", "time_main": "${time_main}", "time_pp": "${time_pp}", "bytes_used": "${bytes_used}", "program": "${program}"}} ms, bytes.`);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
})();
