const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = 700;
canvas.height = 400;


canvas.tabIndex = 1;

let isDragging = false;
let selectedTextBox = null;
let offsetX = 0;
let offsetY = 0;
let cursorIndex = 0;
let selectionStart = null;
let selectionEnd = null;
const textBoxes = [];
const history = [];
const redoStack = [];
const lineHeight = 24;
const margin = 10;

const defaultFont = "16px Roboto, sans-serif";
const defaultColor = "#000000";
const defaultStyle = { bold: false, italic: false, underline: false, strike: false };

function saveHistory() {
  history.push(JSON.stringify(textBoxes));
  redoStack.length = 0; 
}

document.getElementById("addTextBtn").addEventListener("click", () => {
  const newTextBox = {
    x: margin,
    y: margin,
    width: canvas.width - margin * 2,
    height: lineHeight,
    text: "",
    font: defaultFont,
    color: defaultColor,
    style: { ...defaultStyle },
    isEditing: true,
  };
  textBoxes.push(newTextBox);
  selectedTextBox = newTextBox;
  cursorIndex = 0;
  saveHistory();
  drawCanvas();
});

["bold", "italic", "underline", "strike"].forEach((style) => {
  document.getElementById(`${style}Btn`).addEventListener("click", () => {
    if (selectedTextBox) {
      if (selectionStart !== null && selectionEnd !== null) {
        applyStyleToSelection(style);
      } else {
        selectedTextBox.style[style] = !selectedTextBox.style[style];
      }
      drawCanvas();
    }
  });
});


document.getElementById("fontFamily").addEventListener("change", (e) => {
  if (selectedTextBox) {
    const fontFamily = e.target.value;
    selectedTextBox.font = `${parseInt(selectedTextBox.height)}px ${fontFamily}`;
    drawCanvas();
  }
});

document.getElementById("fontSize").addEventListener("change", (e) => {
  if (selectedTextBox) {
    const fontSize = parseInt(e.target.value);
    const fontFamily = selectedTextBox.font.split(" ").slice(1).join(" ");
    selectedTextBox.font = `${fontSize}px ${fontFamily}`;
    selectedTextBox.height = fontSize + 4;
    drawCanvas();
  }
});

document.getElementById("colorPicker").addEventListener("input", (e) => {
  if (selectedTextBox) {
    if (selectionStart !== null && selectionEnd !== null) {
      applyStyleToSelection("color", e.target.value);
    } else {
      selectedTextBox.color = e.target.value;
    }
    drawCanvas();
  }
});


document.getElementById("undoBtn").addEventListener("click", () => {
  if (history.length > 0) {
    redoStack.push(JSON.stringify(textBoxes));
    const lastState = history.pop();
    Object.assign(textBoxes, JSON.parse(lastState));
    drawCanvas();
  }
});

document.getElementById("redoBtn").addEventListener("click", () => {
  if (redoStack.length > 0) {
    history.push(JSON.stringify(textBoxes));
    const nextState = redoStack.pop();
    Object.assign(textBoxes, JSON.parse(nextState));
    drawCanvas();
  }
});


canvas.addEventListener("mousedown", (e) => {
  const { offsetX: x, offsetY: y } = e;
  for (const textBox of textBoxes) {
    if (
      x >= textBox.x &&
      x <= textBox.x + textBox.width &&
      y >= textBox.y &&
      y <= textBox.y + textBox.height
    ) {
      isDragging = true;
      selectedTextBox = textBox;
      offsetX = x - textBox.x;
      offsetY = y - textBox.y;
      break;
    }
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (isDragging && selectedTextBox) {
    const { offsetX: x, offsetY: y } = e;
    selectedTextBox.x = Math.max(margin, x - offsetX);
    selectedTextBox.y = Math.max(margin, y - offsetY);
    drawCanvas();
  }
});

canvas.addEventListener("mouseup", () => {
  if (isDragging) saveHistory();
  isDragging = false;
});

canvas.addEventListener("keydown", (e) => {
  if (selectedTextBox && selectedTextBox.isEditing) {
    selectedTextBox.lines = selectedTextBox.lines || [""];
    const lines = selectedTextBox.lines;


    let currentLineIndex = Math.floor(cursorIndex / selectedTextBox.width);
    let lineCursorIndex = cursorIndex % selectedTextBox.width;

    if (e.key === "Backspace") {
      
      if (cursorIndex > 0) {
        const lineText = lines[currentLineIndex];
        if (lineCursorIndex > 0) {
          
          lines[currentLineIndex] =
            lineText.slice(0, lineCursorIndex - 1) + lineText.slice(lineCursorIndex);
          cursorIndex--;
        } else if (currentLineIndex > 0) {
          
          const prevLine = lines[currentLineIndex - 1];
          lines[currentLineIndex - 1] += lineText;
          lines.splice(currentLineIndex, 1);
          currentLineIndex--;
          cursorIndex--;
        }
      }
    } else if (e.key === "Enter") {
      
      const lineText = lines[currentLineIndex];
      lines[currentLineIndex] = lineText.slice(0, lineCursorIndex);
      lines.splice(currentLineIndex + 1, 0, lineText.slice(lineCursorIndex));
      currentLineIndex++;
      cursorIndex = currentLineIndex * selectedTextBox.width;
    } else if (e.key.length === 1) {
      
      const lineText = lines[currentLineIndex];
      const testLine = lineText.slice(0, lineCursorIndex) + e.key + lineText.slice(lineCursorIndex);
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth <= selectedTextBox.width) {
        
        lines[currentLineIndex] = testLine;
        cursorIndex++;
      } else {
        
        lines[currentLineIndex] = lineText.slice(0, lineCursorIndex);
        lines.splice(currentLineIndex + 1, 0, e.key + lineText.slice(lineCursorIndex));
        currentLineIndex++;
        cursorIndex = currentLineIndex * selectedTextBox.width;
      }
    }

    saveHistory();
    drawCanvas();
  }
});

function drawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const textBox of textBoxes) {
    drawTextBox(textBox);
  }
}

function drawTextBox(textBox) {
  
  const fontStyle = [
    textBox.style.italic ? "italic" : "",
    textBox.style.bold ? "bold" : "",
    textBox.font,
  ].filter(Boolean).join(" ");
  
  ctx.font = fontStyle; 
  ctx.fillStyle = textBox.color;

  textBox.lines = textBox.lines || [""];
  let y = textBox.y + lineHeight;

  for (let i = 0; i < textBox.lines.length; i++) {
    const line = textBox.lines[i];
    ctx.fillText(line, textBox.x + margin, y);

   
    if (textBox.style.underline || textBox.style.strike) {
      drawTextDecorations(line, textBox, y, textBox.style.underline, textBox.style.strike);
    }

    y += lineHeight;
  }

  if (textBox.isEditing && selectedTextBox === textBox) {
    drawCursor(textBox);
  }
}

function wrapText(textBox) {
  const words = textBox.text.split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const testLine = `${line}${word} `;
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > textBox.width) {
     
      lines.push(line.trim());
      line = `${word} `;
    } else {
      line = testLine;
    }
  }

 
  lines.push(line.trim());


  const textHeight = lines.length * lineHeight;
  if (textHeight > canvas.height - margin) {
  
    const maxLines = Math.floor((canvas.height - margin * 2) / lineHeight);
    return lines.slice(0, maxLines);
  }

  return lines;
}

function drawCursor(textBox) {
  const lines = textBox.lines;
  const currentLineIndex = lines.length - 1;
  const lineText = lines[currentLineIndex] || "";

  ctx.font = textBox.font;
  const cursorX = textBox.x + margin + ctx.measureText(lineText).width;
  const cursorY = textBox.y + lineHeight * (currentLineIndex + 1);


  ctx.beginPath();
  ctx.moveTo(cursorX, cursorY - lineHeight + 4);
  ctx.lineTo(cursorX, cursorY - 4);
  ctx.stroke();
}
function drawTextDecorations(line, textBox, y, underline, strike) {
  const textMetrics = ctx.measureText(line);
  const textWidth = textMetrics.width;


  const fontSize = parseInt(textBox.font.match(/\d+/)[0], 10);
  const underlineY = y + 2;
  const strikeY = y - fontSize / 3;

  ctx.beginPath();
  ctx.strokeStyle = textBox.color;
  ctx.lineWidth = 1.5;

  if (underline) {
    ctx.moveTo(textBox.x + margin, underlineY);
    ctx.lineTo(textBox.x + margin + textWidth, underlineY);
  }

  if (strike) {
    ctx.moveTo(textBox.x + margin, strikeY);
    ctx.lineTo(textBox.x + margin + textWidth, strikeY);
  }

  ctx.stroke();
}
