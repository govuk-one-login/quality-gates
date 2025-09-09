```js
import { decorateWithRequiredCheck, keyByCheckType } from "./components/data-manipulation.js"
import { renderDataTable } from "./components/table.js"
```
# Quality Gates

<p></p>

## ${repositoryBranchProtection.repo}

```js
display(renderDataTable(dataTable))
```

---

```js
const repositoryActions = FileAttachment("./data/github-actions.json").json();
```

```js
const repositoryBranchProtection = FileAttachment("./data/github-branch-protection.json").json();
```

```js
const schema = FileAttachment("./data/schema.json").json();
```

```js
const manifest = FileAttachment("./data/github-manifest.json").json();
```

## Schema
```js
display(schema)
```

### Defined Checks
```js
display(schema.$defs["check-type"].items.oneOf[0].enum)

const rfcChecks = schema.$defs["check-type"].items.oneOf[0];
const extraChecks = schema.$defs["check-type"].items.oneOf[1]
```

## Manifest
```js
display(manifest.manifest.services[0])
```

### Checks
```js
display(manifest.manifest.services[0]["quality-gates"])
```

## GitHub Settings

```js
display(repositoryBranchProtection)
```

---

```js

const dataTable =
    keyByCheckType(
        decorateWithRequiredCheck(manifest.manifest.services[0]["quality-gates"],
        repositoryBranchProtection?.github_settings?.required_status_checks?.checks),
        schema.$defs["check-type"].items.oneOf[0].enum
    )
```

```js
display(dataTable)
```
