/*
You have two CSS-Module files in a Next.js project:
    – components/EthosProfileCard.module.css
    – styles/Home.module.css

  1. Parse both files and identify any class selectors that are defined in both (e.g. .avatar, .username, etc.).
  2. For each duplicate:
     • Choose EthosProfileCard.module.css as the source-of-truth.
     • Remove the duplicate rule from Home.module.css.
  3. If there are shared rules you want to keep in both, extract them into a new Shared.module.css and update both components to import it.
  4. At the end, ensure:
     • EthosProfileCard.jsx imports only EthosProfileCard.module.css (plus Shared.module.css if used).
     • Home.jsx (or Home.module.css) no longer contains any of the unwanted duplicates.

  Generate a Node.js script (using PostCSS or regex) or shell script that automates these steps.
*/

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const cardCssPath = path.join(__dirname, 'components', 'EthosProfileCard.module.css');
const homeCssPath = path.join(__dirname, 'styles', 'Home.module.css');
const sharedCssPath = path.join(__dirname, 'styles', 'Shared.module.css');

function getClassRules(root) {
  const map = new Map();
  root.walkRules(rule => {
    rule.selectors.forEach(sel => {
      const match = sel.match(/^\.(\w+)/);
      if (match) {
        map.set(match[1], rule);
      }
    });
  });
  return map;
}

const cardRoot = postcss.parse(fs.readFileSync(cardCssPath, 'utf8'));
const homeRoot = postcss.parse(fs.readFileSync(homeCssPath, 'utf8'));

const cardClasses = getClassRules(cardRoot);
const homeClasses = getClassRules(homeRoot);

const duplicates = [];
homeClasses.forEach((rule, name) => {
  if (cardClasses.has(name)) {
    duplicates.push(name);
    rule.remove();
  }
});

if (duplicates.length) {
  const sharedRoot = postcss.root();
  duplicates.forEach(name => {
    const rule = cardClasses.get(name);
    sharedRoot.append(rule.clone());
    rule.remove();
  });

  fs.writeFileSync(sharedCssPath, sharedRoot.toString());
  fs.writeFileSync(cardCssPath, cardRoot.toString());
  fs.writeFileSync(homeCssPath, homeRoot.toString());

  const filesToUpdate = [
    { file: path.join(__dirname, 'components', 'EthosProfileCard.jsx'), importPath: '../styles/Shared.module.css' },
    { file: path.join(__dirname, 'pages', 'index.js'), importPath: '../styles/Shared.module.css' }
  ];

  filesToUpdate.forEach(({ file, importPath }) => {
    let src = fs.readFileSync(file, 'utf8');
    if (!src.includes(importPath)) {
      src = src.replace(/(import .*?\n)/, `$1import sharedStyles from '${importPath}';\n`);
    }
    duplicates.forEach(name => {
      const regex = new RegExp(`styles\\.${name}`, 'g');
      src = src.replace(regex, `sharedStyles.${name}`);
    });
    fs.writeFileSync(file, src);
  });

  console.log('Moved shared classes:', duplicates.join(', '));
} else {
  console.log('No duplicates found.');
}
