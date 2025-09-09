import _ from "npm:lodash"

export function keyByCheckType(checks, allChecks)  {

    const reshaped = allChecks.reduce((acc, value) => {
        acc[value] =  checks.filter((gate) => gate["check-types"].includes(value))

        return acc;

    },{})

    return reshaped
}

export function decorateWithRequiredCheck (checks, branchProtectionJobNames) {
    return checks.map((check) => {
        return {
            enforced: _.some(branchProtectionJobNames, (jobNameObj) => {
                return check.config["name"] === jobNameObj.context || check.config["path"] === `jobs.${jobNameObj.context}`
            }),
            ...check
        }
    })
}
