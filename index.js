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
        console.debug("testing " + this._attribute + ": " + answers[this._attribute])
        //console.debug(this._branches[0])
        if (this._branches[0] instanceof WeightDecisionNode) {
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
                console.log(i, this._branches.length)
                let branch = this._branches[i]
                if (branch instanceof ValueDecisionNode) {
                    if (branch._value == value) {
                        console.debug("following branch " + branch._value)
                        return branch._findActionForAnswers(answers)
                    }
                    else {
                        console.debug("not following branch " + branch._value)
                    }
                }
                else if (branch instanceof PredicateDecisionNode) {
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
        let splitAttributeIndex = this._chooseSplitAttribute(examples, actions, attributes)
        console.log("splitting on " + attributes[splitAttributeIndex])
        let tree = new DecisionTree(attributes[splitAttributeIndex])
        this._splitNode(tree.root, examples, actions, attributes, splitAttributeIndex)
        return tree
    }

    static _chooseSplitAttribute(examples, actions, attributes) {
        let informationGain = attributes.map((attribute, index)=>{
            console.log("examining attribute " + attribute)
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
        return informationGain.reduce((maxIndex, value, i, list) => value > list[maxIndex] ? i : maxIndex, 0);
    }

    static _splitNode(node, examples, actions, attributes, attributeIndex) {
        let values = this.distinctValues(examples.map(row=>row[attributeIndex]))
        // Split examples and actions into new lists
        console.log(values)
        console.log([examples, actions, attributes])
        let data = values.map(value=>{
            return [
                // Remove rows not matching this branch, and remove the attribute
                examples.filter(row=>row[attributeIndex] == value).map(row=>row.filter((_, index)=>index != attributeIndex)),
                // Remove rows not matching this branch, to keep it in sync with examples
                actions.filter((_, index)=>examples[index][attributeIndex] == value),
                // Remove the attribute
                attributes.filter((_, index)=>index != attributeIndex)
            ]
        })
        console.log("data after split", data)
        data.forEach(([newExamples, newActions, newAttributes], index)=>{
            let value = values[index]
            // If the actions are all the same, create a leaf
            if (newActions.every(action=>action == newActions[0])) {
                console.log(newActions, "creating leaf with " + attributes[attributeIndex] + "==" + value + " in " + node._value)
                node.createBranchWithValue(value, newActions[0])
            }
            else { // Else
                // If there are attributes left to branch on, branch
                if (newAttributes.length > 0) {
                    console.log(newActions, "creating branch with " + attributes[attributeIndex] + "==" + value)
                    let splitAttributeIndex = this._chooseSplitAttribute(newExamples, newActions, newAttributes)
                    console.log("splitting on " + newAttributes[splitAttributeIndex])
                    let childNode = node.createBranchWithValue(value, newAttributes[splitAttributeIndex])
                    this._splitNode(childNode, newExamples, newActions, newAttributes, splitAttributeIndex)
                }
                else { // Otherwise create a leaf with the most common action
                    console.log(newActions, "creating leaf with most common action " + attributes[attributeIndex] + "==" + value)
                    this.calcFrequency(newActions)
                    let entries = Object.entries(newActions)
                    let [action, frequency] = entries.reduce((maxPair, pair)=>pair[0] > maxPair[1] ? pair : maxPair, entries[0])
                    node.createBranchWithValue(value, newActions[0])
                }
            }
        })
    }

    static distinctValues(list) {
        return Object.keys(this.calcFrequency(list))
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

function testManualExample() {
    let tree = new DecisionTree("type")
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
    console.log(tree.findActionForAnswers({type:"light", power:0.7}))
}

function testCreateWithExamples(examples, actions, attributes) {
    let tree = DecisionTree.createWithExamples(examples, actions, attributes)
    examples.forEach((example, index)=>{
        let answers = attributes.reduce((map, attribute, attributeIndex)=>{map[attribute] = example[attributeIndex]; return map}, {})
        let action = tree.findActionForAnswers(answers)
        console.log(answers, action, actions[index], action == actions[index])
    })
}

function testCategoryExample() {
    // Data from https://www.geeksforgeeks.org/decision-tree-introduction-example/
    let examples = [
        [1, 1, 1],
        [1, 1, 0],
        [0, 0, 1],
        [1, 0, 0],
    ]
    let actions = [
        "I",
        "I",
        "II",
        "II",
    ]
    let attributes = [
        "x",
        "y",
        "z"
    ]

    testCreateWithExamples(examples, actions, attributes)
}

//testCategoryExample()

function testRatingExample() {
    // Data from https://towardsdatascience.com/entropy-how-decision-trees-make-decisions-2946b9c18c8
    let examples = [
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
    ]
    let actions = [
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
    ]
    let attributes = [
        "rating"
    ]
    testCreateWithExamples(examples, actions, attributes)
}

//testRatingExample()

function testGolfExample() {
    // Data from https://kindsonthegenius.com/blog/how-to-build-a-decision-tree-for-classification-step-by-step-procedure-using-entropy-and-gain/
    let examples = [
        ["rainy",       "hot",  "high",     "false"],
        ["rainy",       "hot",  "high",     "true"],
        ["overcast",    "hot",  "high",     "false"],
        ["sunny",       "mild", "high",     "false"],
        ["sunny",       "cool", "normal",   "false"],
        ["sunny",       "cool", "normal",   "true"],
        ["overcast",    "cool", "normal",   "true"],
        ["rainy",       "mild", "high",     "false"],
        ["rainy",       "cool", "normal",   "false"],
        ["sunny",       "mild", "normal",   "false"],
        ["rainy",       "mild", "normal",   "true"],
        ["overcast",    "mild", "high",     "true"],
        ["overcast",    "hot",  "normal",   "false"],
        ["sunny",       "mild", "high",     "true"]
    ]
    let actions = [
        "no",
        "no",
        "yes",
        "yes",
        "yes",
        "no",
        "yes",
        "no",
        "yes",
        "yes",
        "yes",
        "yes",
        "yes",
        "no",
    ]
    let attributes = [
        "outlook", 
        "temperature", 
        "humidity",
        "windy"
    ]
    testCreateWithExamples(examples, actions, attributes)
}

testGolfExample()

function testAppleGkExample() {
    // Data from https://developer.apple.com/documentation/gameplaykit/gkdecisiontree?language=objc#1965709
    DecisionTree.createWithExamples(
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
    ])
}