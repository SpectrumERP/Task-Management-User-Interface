const fs = require('fs');
const path = require('path');

const masterManagerPath = '/Users/premnand/forceIntellect/Task Management/task-flow/src/components/master/MasterManager.tsx';
let content = fs.readFileSync(masterManagerPath, 'utf8');

// Wrap "Add Record" button
content = content.replace(
  /(\{\/\* Add Record Button \*\/\}\s*)<Button\s+onClick=\{handleAddClick\}([\s\S]*?)<\/Button>/g,
  '$1{isSave && (\n        <Button onClick={handleAddClick}$2</Button>\n      )}'
);

// We should wrap the buttons holding handleEditClick and handleDeleteClick
// These are sometimes span, button, or Button.
// For handleEditClick inside a tag (e.g. <Button ... onClick={() => handleEditClick...):
content = content.replace(
  /(<(?:Button|button|span|td|h4|div)[^>]*onClick=\{[^}]*handleEditClick[^}]*\}[^>]*>[\s\S]*?<\/(?:Button|button|span|td|h4|div)>)/g,
  '{isUpdate && (\n$1\n)}'
);

// Similarly for handleDeleteClick
content = content.replace(
  /(<(?:Button|button|span|td|h4|div)[^>]*onClick=\{[^}]*handleDeleteClick[^}]*\}[^>]*>[\s\S]*?<\/(?:Button|button|span|td|h4|div)>)/g,
  '{isDelete && (\n$1\n)}'
);

// Need to fix a small issue: If they are already wrapped, this might double wrap?
// We can check if it's already wrapped.

fs.writeFileSync(masterManagerPath, content, 'utf8');
console.log('MasterManager.tsx updated.');
