// Note: Changing environment variables doesn't invalidate the cache
// Restart and delete src/.observable/cache/data/level-groups.json to refresh

import "dotenv/config";

import { readFileSync } from "fs";

// Fetch checks from schema
const schemaUrl = new URL("../../../schemas/schema.json", import.meta.url)
const schema = JSON.parse(readFileSync(schemaUrl, "utf8"))
const checkTypes = schema.$defs["check-type"].items.oneOf.flatMap((oneOf) => oneOf.enum)
const phases = schema.$defs.check.properties.phase.items.oneOf.flatMap((oneOf) => oneOf.enum)

// Manipulate Environment variables
const { LEVEL_GROUP_DELIMITER:DELIMITER, LEVEL_GROUP_PREFIX:PREFIX } = process.env;

const groupEnvVars = Object.keys(process.env)
    .filter(key => key.startsWith(PREFIX))

const data = groupEnvVars.reduce((acc, envvar) => {
    const [ __, level, phase ] = envvar.split(DELIMITER)

    if(!phases.includes(phase.toLowerCase().replace("_","-"))) {
        console.error(`Invalid phase in ${envvar} - ${phase}`)
        return acc
    }

    const envChecks = process.env[envvar].split(',').sort();

    const invalidEnvChecks = envChecks.filter(c => !checkTypes.includes(c))
    const validEnvChecks = envChecks.filter(c => checkTypes.includes(c))

    if(invalidEnvChecks.length) {
        console.error(`Invalid checks in ${envvar}: ${invalidEnvChecks.toString()}`)
    }

    const setting = {
        name: level.toLowerCase().replace("_","-"),
        phase: phase.toLowerCase().replace("_","-"),
        checks: validEnvChecks.sort()
    }

    return acc.concat(setting)
}, [])

console.log(JSON.stringify(data, null, 2))
