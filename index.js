class DecisionNode {
    constructor(attribute) {
        this._attribute = attribute
        this._branches = []
    }

    createBranchWithValue(value, attribute) {
        let branch = new ValueDecisionNode(value, attribute)
        this._branches.push(branch)
        return branch
    }

    createBranchWithPredicate(predicate, attribute) {
        let branch = new PredicateDecisionNode(predicate, attribute)
        this._branches.push(branch)
        return branch
    }

    createBranchWithWeight(weight, attribute) {
        let branch = new WeightDecisionNode(weight, attribute)
        this._branches.push(branch)
        return branch
    }

    _findActionForAnswers(answers) {
        // If this is a leaf, return the action
        if (this._branches.length == 0) {
            return this._attribute
        }
        console.debug("testing " + this._attribute)
        //console.debug(this._branches[0])
        if (this._branches[0]._weight) {
            let total = this._branches.reduce((a, v)=>a + v._weight, 0)
            let choice = Math.random() * total
            console.debug("total weight " + total + " chosen " + choice)
            let acc = 0
            for (let i = 0; i < this._branches.length; i++) {
                let branch = this._branches[i]
                acc += branch._weight
                if (choice < acc) {
                    return branch._findActionForAnswers(answers)
                }
            }
            return this._branches[this._branches.length-1]._findActionForAnswers(answers)
        }
        else {
            let value = answers[this._attribute]
            for (let i = 0; i < this._branches.length; i++) {
                let branch = this._branches[i]
                if (branch._value) {
                    if (branch._value == value) {
                        console.debug("following branch " + branch._value)
                        return branch._findActionForAnswers(answers)
                    }
                }
                else if (branch._predicate) {
                    if (branch._predicate(value)) {
                        console.debug("following branch " + branch._predicate)
                        return branch._findActionForAnswers(answers)
                    }
                }
            }
        }
        console.debug("fall through")
        return undefined
    }
}

class ValueDecisionNode extends DecisionNode {
    constructor(value, attribute) {
        super(attribute)
        this._value = value
    }
}

class PredicateDecisionNode extends DecisionNode {
    constructor(predicate, attribute) {
        super(attribute)
        this._predicate = predicate
    }
}

class WeightDecisionNode extends DecisionNode {
    constructor(weight, attribute) {
        super(attribute)
        this._weight = weight
    }
}

class DecisionTree {
    constructor(attribute) {
        this._root = new DecisionNode(attribute)
    }

    get root() {
        return this._root
    }

    findActionForAnswers(answers) {
        return this._root._findActionForAnswers(answers)
    }

    static createWithExamples(examples, actions, attributes) {
        let informationGain = attributes.map((attribute, index)=>{
            let actionsCount = this.calcFrequency(actions)
            let parentEntropy = this.calcWeightedEntropySum(Object.values(actionsCount), actions.length)
            let column = examples.map(row=>row[index])
            let valuesCount = this.calcFrequency(column)
            let valueEntropy = Object.entries(valuesCount).map(([value, count])=>{
                let actionsForValue = actions.filter((action, actionIndex)=>{
                    //console.log(examples[actionIndex][index], value, examples[actionIndex][index] == value, typeof(value))
                    return examples[actionIndex][index] == value
                })
                let actionsForValueCount = this.calcFrequency(actionsForValue)
                let valueEntropy = this.calcWeightedEntropySum(Object.values(actionsForValueCount), count)
                return (count/actions.length) * valueEntropy
            })
            console.log("parent entropy", parentEntropy)
            
            console.log("entropy", valueEntropy)
            let totalEntropy = valueEntropy.reduce((sum, weightedEntropy)=>sum + weightedEntropy, 0)
            console.log("totalEntropy", totalEntropy)
            return parentEntropy - totalEntropy
        })
        console.log("informationGain", informationGain)
    }

    static calcFrequency(list) {
        return list.reduce((map, item)=>{
            map[item] = (map[item] || 0) + 1
            return map
        }, {})
    }

    static calcWeightedEntropySum(list, total) {
        return list.reduce((sum, count)=>sum + this.calcEntropy(count, total), 0)
    }

    static calcEntropy(k, n) {
        console.log(k, n, k/n, -(k/n)*Math.log2(k/n))
        return -(k/n)*Math.log2(k/n)
    }
}

/*let tree = new DecisionTree("type")
let dark = tree.root.createBranchWithValue("dark", "power")
dark.createBranchWithPredicate(power=>power > 0.5, "raise the dead")
dark.createBranchWithPredicate(power=>power <= 0.5, "howl in the night")
let light = tree.root.createBranchWithValue("light")
light.createBranchWithWeight(3, "enlightenment")
light.createBranchWithWeight(7, "purify")
console.log(tree.findActionForAnswers({type:"dark", power:0.8}))
console.log(tree.findActionForAnswers({type:"dark", power:0.4}))
console.log(tree.findActionForAnswers({type:"light", power:0.7}))
console.log(tree.findActionForAnswers({type:"light", power:0.7}))
console.log(tree.findActionForAnswers({type:"light", power:0.7}))
console.log(tree.findActionForAnswers({type:"light", power:0.7}))
console.log(tree.findActionForAnswers({type:"light", power:0.7}))
console.log(tree.findActionForAnswers({type:"light", power:0.7}))
console.log(tree.findActionForAnswers({type:"light", power:0.7}))
console.log(tree.findActionForAnswers({type:"light", power:0.7}))
console.log(tree.findActionForAnswers({type:"light", power:0.7}))
console.log(tree.findActionForAnswers({type:"light", power:0.7}))*/

DecisionTree.createWithExamples(
[
    [1, 1, 1],
    [1, 1, 0],
    [0, 0, 1],
    [1, 0, 0],
],
[
    "I",
    "I",
    "II",
    "II",
], 
[
    "x",
    "y",
    "z"
])

/*DecisionTree.createWithExamples(
[
    ["excellent"],
    ["excellent"],
    ["excellent"],
    ["excellent"],
    ["good"],
    ["good"],
    ["good"],
    ["good"],
    ["good"],
    ["good"],
    ["poor"],
    ["poor"],
    ["poor"],
    ["poor"],
],
[
    "normal",
    "normal",
    "normal",
    "high",
    "normal",
    "normal",
    "normal",
    "normal",
    "high",
    "high",
    "high",
    "high",
    "high",
    "high",
], 
[
    "rating"
])*/

/*DecisionTree.createWithExamples(
    [
        ["electric", 10, true],
        ["electric", 30, false],
        ["electric", 40, true],
        ["fire", 20, false],
        ["fire", 30, false],
        ["water", 50, true],
        ["water", 40, false],
    ],
    [
        "psychic Strike",
        "pound",
        "barrier",
        "pound",
        "tackle",
        "pound",
        "tackle",
    ], 
    [
        "type", 
        "hp", 
        "special"
    ])*/