document.addEventListener("DOMContentLoaded", () => {
    const languageSelect = document.getElementById("language-select");
    const codeInput = document.getElementById("code-input");
    const convertBtn = document.getElementById("convert-btn");
    const mipsOutput = document.getElementById("mips-output");
    const binaryOutput = document.getElementById("binary-output");
    const statusMessage = document.getElementById("status-message");
    const copyBtns = document.querySelectorAll(".copy-btn");
    const exampleSelect = document.getElementById("example-select");

    const outputSection = document.getElementById("output-section");
    const mipsContainer = document.getElementById("mips-container");
    const binaryContainer = document.getElementById("binary-container");

    const goTopButton = document.getElementById("go-top");

    window.addEventListener("scroll", () => {
        const scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight;
        const winHeight = window.innerHeight;

        const bottomReached = scrollY + winHeight >= docHeight - 10;

        if (bottomReached) {
            goTopButton.classList.add("show");
        } else {
            goTopButton.classList.remove("show");
        }
    });

    goTopButton.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    // --- Example Code Snippets ---
    const examples = {
        "c_cpp": {
            "Simple Assignment & Print": "int x;\nint y;\nx = 10;\ny = x;\nprint(y);\nprint(x);",
            "Basic Variable Declaration": "int a;\nint b;\na = 5;\nprint(a);"
        },
        "python": {
            "Simple Assignment & Print": "x = 100\ny = x\nprint(y)\nprint(x)",
            "Variable Usage": "a = 20\nb = a\nprint(b)"
        },
        "java": {
            "Simple Assignment & Print (within main context)": "int x;\nint y;\nx = 50;\ny = x;\nSystem.out.println(y);\nSystem.out.println(x);",
            "Basic Variable": "int num;\nnum = 75;\nSystem.out.println(num);"
        }
    };

    // --- MIPS Instruction to Binary Mapping (Simplified) ---
    const mipsToBinaryMap = {
        // R-type (opcode 000000)
        "add": { opcode: "000000", funct: "100000" },
        "sub": { opcode: "000000", funct: "100010" },
        "mul": { opcode: "011100", funct: "000010" },
        "slt": { opcode: "000000", funct: "101010" },
        // I-type
        "addi": { opcode: "001000" },
        "li": { opcode: "001001" }, // Pseudo-instruction, often `ori $rt, $zero, imm` or `lui/ori`
        "lw": { opcode: "100011" },
        "sw": { opcode: "101011" },
        "beq": { opcode: "000100" },
        "bne": { opcode: "000101" },
        // J-type
        "j": { opcode: "000010" },
        "jal": { opcode: "000011" },
        // Syscall is special
        "syscall": { opcode: "000000", funct: "001100" }, // Special R-type
        "la": {}
    };

    const registerToBinaryMap = {
        "$zero": "00000", "$at": "00001", "$v0": "00010", "$v1": "00011",
        "$a0": "00100", "$a1": "00101", "$a2": "00110", "$a3": "00111",
        "$t0": "01000", "$t1": "01001", "$t2": "01010", "$t3": "01011",
        "$t4": "01100", "$t5": "01101", "$t6": "01110", "$t7": "01111",
        "$s0": "10000", "$s1": "10001", "$s2": "10010", "$s3": "10011",
        "$s4": "10100", "$s5": "10101", "$s6": "10110", "$s7": "10111",
        "$t8": "11000", "$t9": "11001", "$k0": "11010", "$k1": "11011",
        "$gp": "11100", "$sp": "11101", "$fp": "11110", "$ra": "11111"
    };

    function decToBinary(dec, bits) {
        let bin = (dec >>> 0).toString(2);
        if (dec < 0 && bits === 16) { // Handle negative for 16-bit immediate (e.g. branch offsets)
            bin = ((1 << bits) + dec).toString(2);
        }
        while (bin.length < bits) {
            bin = "0" + bin;
        }
        return bin.slice(-bits);
    }

    // --- Populate Examples Dropdown ---
    function populateExamples() {
        const selectedLang = languageSelect.value;
        exampleSelect.innerHTML =
            '<option value="" disabled selected>--Select an example--</option>'; // Reset
        if (selectedLang && examples[selectedLang]) {
            for (const exName in examples[selectedLang]) {
                const option = document.createElement("option");
                option.value = examples[selectedLang][exName];
                option.textContent = exName;
                exampleSelect.appendChild(option);
            }
            exampleSelect.disabled = false;
        } else {
            exampleSelect.disabled = true;
        }
    }

    languageSelect.addEventListener("change", () => {
        populateExamples();
        const lang = languageSelect.value;
        let prismLang = "none";
        if (lang === "c_cpp") prismLang = "cpp";
        else if (lang === "python") prismLang = "python";
        else if (lang === "java") prismLang = "java";
        codeInput.className = `language-${prismLang}`;
        // If Prism is available, highlight the input area after changing language or loading example
        if (typeof Prism !== 'undefined' && Prism.highlightAllUnder) {
            try { Prism.highlightAllUnder(document.querySelector('.input-section')); } catch (e) { console.warn("Prism highlighting failed for input section after lang change:", e); }
        }
    });

    exampleSelect.addEventListener("change", () => {
        if (exampleSelect.value) {
            codeInput.value = exampleSelect.value;
            if (typeof Prism !== 'undefined' && Prism.highlightAllUnder) {
                try { Prism.highlightAllUnder(document.querySelector('.input-section')); } catch (e) { console.warn("Prism highlighting failed for input section after example load:", e); }
            }
        }
    });

    // Initial population
    populateExamples();

    // Event listener for the convert button
    convertBtn.addEventListener("click", () => {

        const selectedLanguage = languageSelect.value;
        const sourceCode = codeInput.value.trim();

        mipsOutput.textContent = "";
        binaryOutput.textContent = "";
        statusMessage.textContent = "";
        statusMessage.style.color = "";

        mipsContainer.replaceChildren();
        binaryContainer.replaceChildren();
        mipsCodes = {};

        if (!selectedLanguage) {
            statusMessage.textContent = "Error: Please select an input language.";
            statusMessage.style.color = "red";
            return;
        }
        if (!sourceCode) {
            statusMessage.textContent = "Error: Please enter some code to convert.";
            statusMessage.style.color = "red";
            return;
        }

        statusMessage.textContent = "Converting... Please wait.";

        setTimeout(() => {
            try {
                const mipsResult = convertToMips(sourceCode, selectedLanguage);   // mipsCodes = {idx: []}
                convertMipsToBinary(mipsResult);

                if (typeof Prism !== 'undefined' && Prism.highlightElement) {
                    try { Prism.highlightElement(mipsOutput); } catch (e) { console.warn("Prism highlighting failed for MIPS output:", e); }
                    try { Prism.highlightElement(binaryOutput); } catch (e) { console.warn("Prism highlighting failed for Binary output:", e); }
                } else {
                    console.warn("Prism.js not available for output highlighting.");
                }

                statusMessage.textContent = "Conversion successful!";
                statusMessage.style.color = "#05FF22";
            } catch (error) {
                mipsOutput.textContent = `Error during MIPS conversion: ${error.message}`;
                binaryOutput.textContent = "Error during MIPS to Binary conversion.";
                statusMessage.textContent = `Error: ${error.message}`;
                statusMessage.style.color = "red";
                console.error("Conversion error:", error);
            }
        }, 500);
    });

    function highlight(divParent) {
        const instructionClassName = divParent.classList[1];
        let codes = document.getElementsByClassName(instructionClassName);
        for (let i = 0; i < codes.length; i++) {
            codes[i].style.color = "red";
        }
    }

    function removeHighlight(divParent) {
        const instructionClassName = divParent.classList[1];
        let codes = document.getElementsByClassName(instructionClassName);
        for (let i = 0; i < codes.length; i++) {
            codes[i].style.color = "#ffffff";
        }
    }


    // --- Language Specific Parsers and MIPS Generators ---
    function parseAndGenerateMips(language, code) {
        const dataSegment = { "newline": ".asciiz \"\\n\"" };

        const lines = code.split("\n").map(line => line.trim()).filter(line => line && !line.startsWith(language == "python" ? "#" : "//"));

        const mipsCodes = {}; // classname: [codes];

        lines.forEach((line, idx) => {
            let match;

            const divParent = document.createElement("div");
            divParent.className = `code-container ${idx}`;
            divParent.onmouseover = () => highlight(divParent);
            divParent.onmouseout = () => removeHighlight(divParent);
            const code = document.createElement("code");
            const comments = document.createElement("code");

            if (!mipsCodes[idx]) {
                mipsCodes[idx] = [];
            }

            if (language == "C/C++" || language == "Java") {
                // int x;
                match = line.match(/^int\s+([a-zA-Z_][a-zA-Z0-9_]*);/);
                if (match) {
                    const varName = match[1];
                    if (dataSegment[varName]) throw new Error(`${language}: Variable '${varName}' already declared.`);
                    dataSegment[varName] = ".word 0";
                    return;
                }

                // int x = [var/num/expression] || x = [var/num/expression]
                match = line.match(/^(?:int\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([a-zA-Z_0-9\s+\-\*]+);/);
                if (match) {
                    const destVar = match[1];
                    const expression = match[2].trim();
                    const parts = expression.split(/\s*([+\-\*])\s*/); // Split by + or - or *

                    if (line.includes("int")) {
                        if (dataSegment[destVar]) throw new Error(`${language}: Variable '${destVar}' already declared.`);
                        dataSegment[destVar] = ".word 0";
                    }

                    let currentRegister = "$t0";
                    let firstOperand = parts[0];
                    let registerCounter = 1;

                    if (/^\d+$/.test(firstOperand)) {
                        code.textContent += `\tli ${currentRegister}, ${firstOperand}\n`;
                        comments.textContent += `# Load initial value\n`;
                        mipsCodes[idx].push(`li ${currentRegister}, ${firstOperand}`);
                    } else if (dataSegment.hasOwnProperty(firstOperand)) {
                        code.textContent += `\tlw ${currentRegister}, ${firstOperand}\n`;
                        comments.textContent += `# Load ${firstOperand}\n`;
                        mipsCodes[idx].push(`lw ${currentRegister}, ${firstOperand}`);
                    } else {
                        throw new Error(`${language}: Variable or immediate '${firstOperand}' not declared.`);
                    }

                    for (let i = 1; i < parts.length; i += 2) {
                        const operator = parts[i];
                        const operand = parts[i + 1];
                        const nextRegister = `$t${registerCounter}`;
                        registerCounter++;

                        if (/^\d+$/.test(operand)) {
                            if (operator === "+") {
                                code.textContent += `\taddi ${nextRegister}, ${currentRegister}, ${operand}\n`;
                                comments.textContent += `# ${operator} with immediate value ${operand}\n`;
                                mipsCodes[idx].push(`addi ${nextRegister}, ${currentRegister}, ${operand}`);    
                            } else if (operator === "-") {
                                code.textContent += `\taddi ${nextRegister}, ${currentRegister}, -${operand}\n`;
                                comments.textContent += `# ${operator} with immediate value ${operand}\n`;
                                mipsCodes[idx].push(`addi ${nextRegister}, ${currentRegister}, -${operand}`);    
                            } else if (operator === "*") {
                                if (dataSegment[line[1]]) {
                                    code.textContent += `\tlw ${nextRegister}, ${operand}\n`;
                                    comments.textContent += `# Load ${operand}\n`;
                                    mipsCodes[idx].push(`lw ${nextRegister}, ${operand}`);
                                } else {
                                    code.textContent += `\tli ${nextRegister}, ${operand}\n`;
                                    comments.textContent += `# Load initial value\n`;
                                    mipsCodes[idx].push(`li ${nextRegister}, ${operand}`);
                                }
                                code.textContent += `\tmul ${nextRegister}, ${currentRegister}, ${nextRegister}\n`;
                                comments.textContent += `# Multiply ${operand}\n`;
                                mipsCodes[idx].push(`mul ${nextRegister}, ${currentRegister}, ${nextRegister}`);
                            }
                        } else if (dataSegment.hasOwnProperty(operand)) {
                            code.textContent += `\tlw ${nextRegister}, ${operand}\n`;
                            comments.textContent += `# Load ${operand}\n`;
                            mipsCodes[idx].push(`lw ${nextRegister}, ${operand}`);
                            if (operator === "+") {
                                code.textContent += `\tadd ${nextRegister}, ${currentRegister}, ${nextRegister}\n`;
                                comments.textContent += `# Add ${operand}\n`;
                                mipsCodes[idx].push(`add ${nextRegister}, ${currentRegister}, ${nextRegister}`);
                            } else if (operator === "-") {
                                code.textContent += `\tsub ${nextRegister}, ${currentRegister}, ${nextRegister}\n`;
                                comments.textContent += `# Subtract ${operand}\n`;
                                mipsCodes[idx].push(`sub ${nextRegister}, ${currentRegister}, ${nextRegister}`);
                            } else if (operator === "*") {
                                code.textContent += `\tmul ${nextRegister}, ${currentRegister}, ${nextRegister}\n`;
                                comments.textContent += `# Multiply ${operand}\n`;
                                mipsCodes[idx].push(`mul ${nextRegister}, ${currentRegister}, ${nextRegister}`);
                            }
                        } else {
                            throw new Error(`${language}: Variable or immediate '${operand}' not declared.`);
                        }
                        currentRegister = nextRegister; // Update currentRegister for the next operation
                    }
                    code.textContent += `\tsw ${currentRegister}, ${destVar}\n`;
                    comments.textContent += "# Store final result\n";
                    mipsCodes[idx].push(`sw ${currentRegister}, ${destVar}`);
                    divParent.appendChild(code);
                    divParent.appendChild(comments);
                    mipsContainer.appendChild(divParent);
                    return;
                }

                // print(x);
                if (language == "C/C++") {
                    match = line.match(/^print\(([a-zA-Z_][a-zA-Z0-9_]*)\);/) || line.match(/^cout\s*<<\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*;$/);
                } else {
                    match = line.match(/^System\.out\.println\(([a-zA-Z_][a-zA-Z0-9_]*)\);/);
                }

                if (match) {
                    const varName = match[1];
                    if (!dataSegment.hasOwnProperty(varName)) throw new Error(`${language}: Variable '${varName}' not declared before print.`);
                    code.textContent += `\tlw $a0, ${varName}\n`;
                    comments.textContent += `# Load ${varName} to print\n`;
                    mipsCodes[idx].push(`lw $a0, ${varName}`);

                    code.textContent += `\tli $v0, 1\n`;
                    comments.textContent += "# Syscall for print_int\n";
                    mipsCodes[idx].push(`li $v0, 1`);

                    code.textContent += `\tsyscall\n`;
                    comments.textContent += "# Execute print\n";
                    mipsCodes[idx].push(`syscall`);

                    code.textContent += `\tla $a0, newline\n`;
                    comments.textContent += "# Load address of newline\n";
                    mipsCodes[idx].push(`la $a0, newline`);

                    code.textContent += `\tli $v0, 4\n`;
                    comments.textContent += "# Syscall for print_string\n";
                    mipsCodes[idx].push(`li $v0, 4`);

                    code.textContent += `\tsyscall\n`;
                    comments.textContent += "# Print newline\n";
                    mipsCodes[idx].push(`syscall`);

                    divParent.appendChild(code);
                    divParent.appendChild(comments);
                    mipsContainer.appendChild(divParent);
                    return;
                }
            } else if (language == "Python") {
                // x = [num/var/expression]
                match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([a-zA-Z_0-9\s+\-\*]+)$/);
                if (match) {
                    const destVar = match[1];
                    const expression = match[2].trim();
                    const parts = expression.split(/\s*([+\-\*])\s*/); // Split by + or - or *

                    let currentRegister = "$t0";
                    let firstOperand = parts[0];
                    let registerCounter = 1;

                    if (!dataSegment.hasOwnProperty(destVar)) {
                        dataSegment[destVar] = ".word 0";
                    }

                    // Load the first operand into the current register
                    if (/^\d+$/.test(firstOperand)) {
                        code.textContent += `\tli ${currentRegister}, ${firstOperand}\n`;
                        comments.textContent += `# Load ${firstOperand}\n`;
                        mipsCodes[idx].push(`li ${currentRegister}, ${firstOperand}`);
                    } else if (dataSegment.hasOwnProperty(firstOperand)) {
                        code.textContent += `\tlw ${currentRegister}, ${firstOperand}\n`;
                        comments.textContent += `# Load ${firstOperand}\n`;
                        mipsCodes[idx].push(`lw ${currentRegister}, ${firstOperand}`);
                    } else {
                        throw new Error(`${language}: Variable '${firstOperand}' not declared.`);
                    }

                    // Process subsequent operands and operators
                    for (let i = 1; i < parts.length; i += 2) {
                        const operator = parts[i];
                        const operand = parts[i + 1];
                        const nextRegister = `$t${registerCounter}`;
                        registerCounter++;

                        if (/^\d+$/.test(operand)) {
                            if (operator === "+") {
                                code.textContent += `\taddi ${nextRegister}, ${currentRegister}, ${operand}\n`;
                                comments.textContent += `# ${operator} ${operand}\n`;
                                mipsCodes[idx].push(`addi ${nextRegister}, ${currentRegister}, ${operand}`);
                            } else if (operator === "-") {
                                code.textContent += `\taddi ${nextRegister}, ${currentRegister}, -${operand}\n`;
                                comments.textContent += `# ${operator} ${operand}\n`;
                                mipsCodes[idx].push(`addi ${nextRegister}, ${currentRegister}, -${operand}`);
                            } else if (operator === "*") {
                                if (dataSegment[line[1]]) {
                                    code.textContent += `\tlw ${nextRegister}, ${operand}\n`;
                                    comments.textContent += `# Load ${operand}\n`;
                                    mipsCodes[idx].push(`lw ${nextRegister}, ${operand}`);
                                } else {
                                    code.textContent += `\tli ${nextRegister}, ${operand}\n`;
                                    comments.textContent += `# Load initial value\n`;
                                    mipsCodes[idx].push(`li ${nextRegister}, ${operand}`);
                                }
                                code.textContent += `\tmul ${nextRegister}, ${currentRegister}, ${nextRegister}\n`;
                                comments.textContent += `# Multiply ${operand}\n`;
                                mipsCodes[idx].push(`mul ${nextRegister}, ${currentRegister}, ${nextRegister}`);
                            }
                        } else if (dataSegment.hasOwnProperty(operand)) {
                            code.textContent += `\tlw ${nextRegister}, ${operand}\n`;
                            comments.textContent += `# Load ${operand}\n`;
                            mipsCodes[idx].push(`lw ${nextRegister}, ${operand}`);

                            if (operator === "+") {
                                code.textContent += `\tadd ${nextRegister}, ${currentRegister}, ${nextRegister}\n`;
                                comments.textContent += `# Add ${operand}\n`;
                                mipsCodes[idx].push(`add ${nextRegister}, ${currentRegister}, ${nextRegister}`);
                            } else if (operator === "-") {
                                code.textContent += `\tsub ${nextRegister}, ${currentRegister}, ${nextRegister}\n`;
                                comments.textContent += `# Subtract ${operand}\n`;
                                mipsCodes[idx].push(`sub ${nextRegister}, ${currentRegister}, ${nextRegister}`);
                            } else if (operator === "*") {
                                code.textContent += `\tmul ${nextRegister}, ${currentRegister}, ${nextRegister}\n`;
                                comments.textContent += `# Multiply ${operand}\n`;
                                mipsCodes[idx].push(`mul ${nextRegister}, ${currentRegister}, ${nextRegister}`);
                            }
                        } else {
                            throw new Error(`${language}: Variable '${operand}' not declared.`);
                        }
                        currentRegister = nextRegister; // Update currentRegister for the next operation
                    }
                    code.textContent += `\tsw ${currentRegister}, ${destVar}\n`;
                    comments.textContent += `# Store result in ${destVar}\n`;
                    mipsCodes[idx].push(`sw ${currentRegister}, ${destVar}`);
                    divParent.appendChild(code);
                    divParent.appendChild(comments);
                    mipsContainer.appendChild(divParent);
                    return;
                }

                // === Handle print(var) ===
                match = line.match(/^print\(([a-zA-Z_][a-zA-Z0-9_]*)\)$/);
                if (match) {
                    const varName = match[1];
                    if (!dataSegment.hasOwnProperty(varName)) {
                        throw new Error(`Python: Variable '${varName}' not defined before print.`);
                    }
                    code.textContent += `\tlw $a0, ${varName}\n`;
                    comments.textContent += `# Load ${varName} to print\n`;
                    mipsCodes[idx].push(`lw $a0, ${varName}`);

                    code.textContent += `\tli $v0, 1\n`;
                    comments.textContent += "# Syscall for print_int\n";
                    mipsCodes[idx].push(`li $v0, 1`);

                    code.textContent += `\tsyscall\n`;
                    comments.textContent += "# Execute print\n";
                    mipsCodes[idx].push(`syscall`);

                    code.textContent += `\tla $a0, newline\n`;
                    comments.textContent += "# Load address of newline\n";
                    mipsCodes[idx].push(`la $a0, newline`);

                    code.textContent += `\tli $v0, 4\n`;
                    comments.textContent += "# Syscall for print_string\n";
                    mipsCodes[idx].push(`li $v0, 4`);

                    code.textContent += `\tsyscall\n`;
                    comments.textContent += "# Print newline\n";
                    mipsCodes[idx].push(`syscall`);

                    divParent.appendChild(code);
                    divParent.appendChild(comments);
                    mipsContainer.appendChild(divParent);
                    return;
                }
            } else {
                console.log("language invalid");
                throw new Error(`${language}: Language invalid`)
            }

            // === Fallback: Unsupported ===
            throw new Error(`${language}: # Unsupported ${language} line: ${line}`)
            code.textContent += `\t# Unsupported ${language} line: ${line}\n`;
            divParent.appendChild(code);
            mipsContainer.appendChild(divParent);
        })

        let finalDataSegmentContent = ".data\n";
        mipsCodes['header'] = ['.data'];
        for (const varName in dataSegment) {
            finalDataSegmentContent += `${varName}: ${dataSegment[varName]}\n`;
            mipsCodes["header"].push(`${varName}: ${dataSegment[varName]}`);
        }

        const codeHeader = document.createElement("code");
        codeHeader.className = "codeHeader";
        codeHeader.textContent += finalDataSegmentContent;
        codeHeader.textContent += "\n.text\n.globl main\nmain:\n";
        mipsCodes["header"].push(".text");
        mipsCodes["header"].push(".globl main");
        mipsCodes["header"].push("main:");

        mipsContainer.insertBefore(codeHeader, mipsContainer.firstChild);


        const divFooter = document.createElement("div");
        const codeFooter = document.createElement("code");
        const codeFooterComments = document.createElement("code");

        divFooter.className = "code-container exit";
        divFooter.onmouseover = highlight;
        divFooter.onmouseover = () => highlight(divFooter);
        divFooter.onmouseout = () => removeHighlight(divFooter);

        mipsCodes['exit'] = ['li $v0, 10', 'syscall'];

        codeFooter.textContent += `\tli $v0, 10\n`;
        codeFooterComments.textContent += `# Syscall for exit\n`;

        codeFooter.textContent += `\tsyscall\n`;
        codeFooterComments.textContent += `# Execute exit\n`;

        divFooter.appendChild(codeFooter);
        divFooter.appendChild(codeFooterComments);
        mipsContainer.appendChild(divFooter);
        return mipsCodes;
    }


    function convertToMips(code, language) {
        console.log(`Converting ${language} code to MIPS:`);
        if (code.toLowerCase().includes("testerror")) {
            throw new Error("Simulated critical error in MIPS conversion.");
        }

        switch (language) {
            case "c_cpp":
                return parseAndGenerateMips("C/C++", code);
            case "python":
                return parseAndGenerateMips("Python", code);
            case "java":
                return parseAndGenerateMips("Java", code);
            default:
                throw new Error(`Unsupported language for MIPS conversion: ${language}`);
        }
    }

    function convertMipsToBinary(mipsCode) {
        const labelAddresses = {};
        const dataLabelAddresses = {};
        let currentAddress = 0x00400000;
        let dataAddressCounter = 0x10010000;
        let inTextSegment = false;
        let inDataSegment = false;

        let tempAddress = 0;

        for (var i = 0; i < mipsCode["header"].length; i++) {
            const line = mipsCode["header"][i].trim();
            if (!line) return;
            if (line === ".data") { inDataSegment = true; inTextSegment = false; tempAddress = dataAddressCounter; continue; }
            if (line === ".text") { inTextSegment = true; inDataSegment = false; tempAddress = currentAddress; continue; }

            if (line.endsWith(":")) {
                const label = line.slice(0, -1);
                if (inTextSegment) {
                    labelAddresses[label] = tempAddress;
                } else if (inDataSegment) {
                    dataLabelAddresses[label] = tempAddress;
                }
            } else if (inTextSegment && !line.startsWith(".")) {
                const parts = line.replace(/,/g, " ").split(/\s+/).filter(p => p);
                if (parts.length > 0 && mipsToBinaryMap[parts[0].toLowerCase()]) {
                    tempAddress += 4;
                }
            } else if (inDataSegment) {
                const parts = line.split(/\s+/);
                const labelMatch = parts[0].match(/^(\w+):$/);
                let label = null;
                let directiveIndex = 0;
                if (labelMatch) {
                    label = labelMatch[1];
                    dataLabelAddresses[label] = tempAddress;
                    directiveIndex = 1;
                }
                const directive = parts[directiveIndex];
                if (directive === ".word") {
                    tempAddress += 4 * (parts.length - 1 - directiveIndex);
                } else if (directive === ".asciiz") {
                    const str = parts.slice(directiveIndex + 1).join(" ").slice(1, -1);
                    tempAddress += (str.replace(/\\n/g, "\n").length + 1);
                    if (tempAddress % 4 !== 0) tempAddress = tempAddress + (4 - (tempAddress % 4));
                }
            }
        }

        inTextSegment = false;
        inDataSegment = false;
        currentAddress = 0x00400000;
        dataAddressCounter = 0x10010000;

        Object.keys(mipsCode).map(key => {
            if (key === "header") return;
            for (var i = 0; i < mipsCode[key].length; i++) {
                const codeBinary = document.createElement("code");
                codeBinary.className = `code-container ${key}`;
                const originalLine = mipsCode[key][i].trim();
                const line = mipsCode[key][i].trim();

                const parts = line.replace(/,/g, "").split(/\s+/).filter(p => p);

                if (parts.length === 0) {
                    binaryRepresentation += `// ${originalLine}`;
                    return;
                }

                const instruction = parts[0].toLowerCase();
                const def = mipsToBinaryMap[instruction];
                let binInstruction = "????????????????????????????????";
                
                if (def) {
                    if (instruction === "syscall") {
                        binInstruction = `${def.opcode}00000000000000000000${def.funct}`;
                    } else if (def.funct) {
                        const rd = registerToBinaryMap[parts[1]] || "00000";
                        const rs = registerToBinaryMap[parts[2]] || "00000";
                        const rt = registerToBinaryMap[parts[3]] || "00000";
                        const shamt = "00000";
                        binInstruction = `${def.opcode}${rs}${rt}${rd}${shamt}${def.funct}`
                    } else if (instruction === "addi") {
                        const rt = registerToBinaryMap[parts[1]] || "00000";
                        const rs = registerToBinaryMap[parts[2]] || "00000";
                        const immediate = parseInt(parts[3]);
                        const immediate_bin = decToBinary(immediate & 0xFFFF, 16);
                        binInstruction = `${def.opcode}${rs}${rt}${immediate_bin}`;
                    } else if (instruction === "li") {
                        const rt = registerToBinaryMap[parts[1]] || "00000";
                        const imm = parseInt(parts[2]);
                        if (imm >= -32768 && imm <= 65535) {
                            const rs_zero = registerToBinaryMap["$zero"];
                            binInstruction = `001001${rs_zero}${rt}${decToBinary(imm, 16)}`;
                        } else {
                            throw new Error(`${language}: complex_li_expansion_needed`);
                            binInstruction = `complex_li_expansion_needed`;
                        }
                    } else if (instruction === "lw" || instruction === "sw") {
                        const rt_reg = registerToBinaryMap[parts[1]] || "00000";
                        let offset_bin = "0000000000000000";
                        let rs_reg = "00000";
                        const memPart = parts[2];
                        const memMatch = memPart.match(/(\d+)?\(([\$\w]+)\)/);
                        if (memMatch) {
                            offset_bin = decToBinary(parseInt(memMatch[1] || "0"), 16);
                            rs_reg = registerToBinaryMap[memMatch[2]] || "00000";
                        } else {
                            if (dataLabelAddresses[memPart]) {
                                const rt_reg = registerToBinaryMap[parts[1]] || "00000"; // The register being loaded/stored
                                const rs_reg = registerToBinaryMap["$zero"]; // Base register is $zero for direct addressing of data labels
                                const offset = dataLabelAddresses[memPart];
                                const offset_bin = decToBinary(offset & 0xFFFF, 16); // Take lower 16 bits as offset

                                binInstruction = `${def.opcode}${rs_reg}${rt_reg}${offset_bin}`;
                            } else {
                                throw new Error(`${language}: unknown_label_for_load_store`);
                                binInstruction  = `unknown_label_for_load_store`;
                            }
                        }
                        if (codeBinary.textContent.startsWith("?")) codeBinary.textContent = `${def.opcode}${rs_reg}${rt_reg}${offset_bin}`;
                    } else if (instruction === "la") { // Handle la pseudo-instruction
                        const targetRegister = registerToBinaryMap[parts[1]] || "00000";
                        const labelName = parts[2];
                        let address = null;

                        if (dataLabelAddresses[labelName] !== undefined) {
                            address = dataLabelAddresses[labelName];
                        } else if (labelAddresses[labelName] !== undefined) {
                            address = labelAddresses[labelName];
                        }

                        if (address !== null) {
                            const upper16Bits = (address >>> 16) & 0xFFFF;
                            const lower16Bits = address & 0xFFFF;
                            const opcode_lui = "001111"; // Opcode for LUI
                            const opcode_ori = "001101"; // Opcode for ORI
                            const rs_zero = registerToBinaryMap["$zero"];

                            function toHex(decimal) {
                                return '0x' + decimal.toString(16).padStart(8, '0');
                            }


                            if (upper16Bits !== 0) {
                                codeBinary.textContent += `${toHex(currentAddress)}: ${opcode_lui}${rs_zero}${targetRegister}${decToBinary(upper16Bits, 16)} //     lui ${parts[1]}, ${upper16Bits}       # Load upper 16 bits of ${labelName} address\n`;
                                currentAddress += 4;
                            }
                            binInstruction = `${opcode_ori}${targetRegister}${targetRegister}${decToBinary(lower16Bits, 16)}`;
                        } else {
                            binInstruction = `label_${labelName}_not_found`;
                            throw new Error(`${language}: label ${labelName} not found`);
                            codeBinary.textContent += `// WARN: Label ${labelName} not found for la\n`;
                        }
                    } else if (instruction === "beq" || instruction === "bne") {
                        const rs_br = registerToBinaryMap[parts[1]] || "00000";
                        const rt_br = registerToBinaryMap[parts[2]] || "00000";
                        const labelName = parts[3];
                        let relativeOffset = "????????????????";
                        if (labelAddresses[labelName]) {
                            const targetAddr = labelAddresses[labelName];
                            const offsetVal = (targetAddr - (currentAddress + 4)) / 4;
                            relativeOffset = decToBinary(offsetVal, 16);
                        } else {
                            throw new Error(`${language}: label ${labelName} not found`);
                            codeBinary.textContent += `// WARN: Label ${labelName} not found for ${instruction}\n`;
                        }
                        binInstruction = `${def.opcode}${rs_br}${rt_br}${relativeOffset}`;
                    } else if (instruction === "j" || instruction === "jal") {
                        const labelName = parts[1];
                        let target = "??????????????????????????";
                        if (labelAddresses[labelName]) {
                            const pseudoDirectAddress = (labelAddresses[labelName] & 0x0FFFFFFF) >> 2;
                            target = decToBinary(pseudoDirectAddress, 26);
                        } else {
                            throw new Error(`${language}: label ${labelName} not found`);
                            codeBinary.textContent += `// WARN: Label ${labelName} not found for ${instruction}\n`;
                        }
                        binInstruction = `${def.opcode}${target}`;
                    } else {
                        throw new Error(`${language}: unknown_instr_format`);
                        binInstruction = "unknown_instr_format";
                    }
                } else {
                    throw new Error(`${language}: invalid_mips_instruction_name`);
                    binInstruction = "invalid_mips_instruction_name";
                }
                codeBinary.textContent = `0x${currentAddress.toString(16)}: ${binInstruction}\n`;
                binaryContainer.appendChild(codeBinary);
                currentAddress += 4;
            } 
        })
    }

    // Event listeners for copy buttons
    copyBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.dataset.target;
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                navigator.clipboard.writeText(targetElement.textContent)
                    .then(() => {
                        const originalText = btn.textContent;
                        btn.textContent = "Copied!";
                        setTimeout(() => {
                            btn.textContent = originalText;
                        }, 2000);
                    })
                    .catch(err => {
                        console.error("Failed to copy text: ", err);
                        statusMessage.textContent = "Failed to copy text: " + err.message;
                        statusMessage.style.color = "red";
                    });
            }
        });
    });

    // Initial setup
    populateExamples();
    if (typeof Prism !== 'undefined' && Prism.highlightAll) {
        try { Prism.highlightAll(); } catch (e) { console.warn("Initial Prism highlighting failed:", e); }
    } else {
        console.warn("Prism.js not available for initial highlighting.");
    }
});

