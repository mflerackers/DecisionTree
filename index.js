class DecisionNode {
    constructor(attribute) {
        this._attribute = attribute
        this._branches = []
    }

    /**
     * @param {any} value The value to match if we were to follow this branch
     * @param {string | any} attribute The next attribute to test once we follow this branch, or the action if it is a leaf.
     * 
     * @return {DecisionNode} The new node
     */
    createBranchWithValue(value, attribute) {
        let branch = new ValueDecisionNode(value, attribute)
        this._branches.push(branch)
        return branch
    }

    /**
     * @param {function} predicate The predicate to match if we were to follow this branch
     * @param {string | any} attribute The next attribute to test once we follow this branch, or the action if it is a leaf.
     * 
     * @return {DecisionNode} The new node
     */
    createBranchWithPredicate(predicate, attribute) {
        let branch = new PredicateDecisionNode(predicate, attribute)
        this._branches.push(branch)
        return branch
    }

    /**
     * @param {number} weight The weight of the new branch, the chance it will be followed is the weight divided by the sum of the weights of all branches
     * @param {string | any} attribute The next attribute to test once we follow this branch, or the action if it is a leaf.
     * 
     * @return {DecisionNode} The new node
     */
    createBranchWithWeight(weight, attribute) {
        let branch = new WeightDecisionNode(weight, attribute)
        this._branches.push(branch)
        return branch
    }

    /**
     * @param {any} actions A map of answers, a name and value for each attribute used in the tree
     * 
     * @return {any} The action according to the answers given
     */
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
                let branch = this._branches[i]
                if (branch instanceof ValueDecisionNode) {
                    if (branch._value == value) {
                        console.debug("following branch " + branch._value)
                        return branch._findActionForAnswers(answers)
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

    /**
     * @return {DecisionNode} The root node
     */
    get root() {
        return this._root
    }

    /**
     * @param {any} actions A map of answers, a name and value for each attribute used in the tree
     * 
     * @return {any} The action according to the answers given
     */
    findActionForAnswers(answers) {
        return this._root._findActionForAnswers(answers)
    }

    /**
     * @param {any[][]} examples Rows of example data, each row containing a list of parameters
     * @param {any[]} actions A list of actions, one for each row in examples
     * @param {string[]} attributes A list of attribute names, one for each column in createWithExamples
     * 
     * @return {DecisionTree} A new DecisionTree which classifies the data in examples into the given actions
     */
    static createWithExamples(examples, actions, attributes) {
        let splitAttributeIndex = this._chooseSplitAttribute(examples, actions, attributes)
        console.log("splitting on " + attributes[splitAttributeIndex])
        let tree = new DecisionTree(attributes[splitAttributeIndex])
        this._splitNode(tree.root, examples, actions, attributes, splitAttributeIndex)
        return tree
    }

    /**
     * @param {any[][]} examples Rows of example data, each row containing a list of parameters
     * @param {any[]} actions A list of actions, one for each row in examples
     * @param {string[]} attributes A list of attribute names, one for each column in createWithExamples
     * @return {number} The index of the best attribute to split on 
     */
    static _chooseSplitAttribute(examples, actions, attributes) {
        let actionsCount = this.calcFrequency(actions)
        let parentEntropy = this.calcWeightedEntropySum(Object.values(actionsCount), actions.length)
        let informationGain = attributes.map((attribute, index)=>{
            console.log("examining attribute " + attribute)
            let column = examples.map(row=>row[index])
            let valuesCount = this.calcFrequency(column)
            let valueEntropy = Object.entries(valuesCount).map(([value, count])=>{
                let actionsForValue = actions.filter((action, actionIndex)=>{
                    return examples[actionIndex][index] == value
                })
                let actionsForValueCount = this.calcFrequency(actionsForValue)
                let valueEntropy = this.calcWeightedEntropySum(Object.values(actionsForValueCount), count)
                return (count/actions.length) * valueEntropy
            })
            let totalEntropy = valueEntropy.reduce((sum, weightedEntropy)=>sum + weightedEntropy, 0)
            console.log("parent entropy", parentEntropy, "entropy", valueEntropy, "totalEntropy", totalEntropy, "informationGain", parentEntropy - totalEntropy)
            return parentEntropy - totalEntropy
        })
        return informationGain.reduce((maxIndex, value, i, list) => value > list[maxIndex] ? i : maxIndex, 0);
    }

    /**
     * @param {DecisionNode} node The node to split
     * @param {any[][]} examples Rows of example data, each row containing a list of parameters
     * @param {any[]} actions A list of actions, one for each row in examples
     * @param {string[]} attributes A list of attribute names, one for each column in examples
     * @param {number} attributeIndex The index of the attribute to split on
     */
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
            else { // Else create branches
                // If there are attributes left to branch on, branch again
                if (newAttributes.length > 0) {
                    console.log(newActions, "creating branch with " + attributes[attributeIndex] + "==" + value)
                    let splitAttributeIndex = this._chooseSplitAttribute(newExamples, newActions, newAttributes)
                    console.log("splitting on " + newAttributes[splitAttributeIndex])
                    let childNode = node.createBranchWithValue(value, newAttributes[splitAttributeIndex])
                    this._splitNode(childNode, newExamples, newActions, newAttributes, splitAttributeIndex)
                }
                else { // Otherwise create a leaf with the most common action (TODO: create weighted leaves with the given probabilities)
                    console.log(newActions, "creating leaf with most common action " + attributes[attributeIndex] + "==" + value)
                    this.calcFrequency(newActions)
                    let entries = Object.entries(newActions)
                    let [action, frequency] = entries.reduce((maxPair, pair)=>pair[0] > maxPair[1] ? pair : maxPair, entries[0])
                    node.createBranchWithValue(value, newActions[0])
                }
            }
        })
    }

    /**
     * @param {any[]} list A list of parameter values
     * 
     * @return {any[]} A list of all distinct values
     */
    static distinctValues(list) {
        return Object.keys(this.calcFrequency(list))
    }

    /**
     * @param {any[]} list A list of parameter values
     * 
     * @return {object} A map containing the frequency for each value
     */
    static calcFrequency(list) {
        return list.reduce((map, item)=>{
            map[item] = (map[item] || 0) + 1
            return map
        }, {})
    }

    /**
     * @param {array} list A list of partials
     * @param {number} total The sum of all partials in the list
     *
     * @return {number} The weighted entropy sum
     */
    static calcWeightedEntropySum(list, total) {
        return list.reduce((sum, count)=>sum + this.calcEntropy(count, total), 0)
    }

    /**
     * @param {number} k A partial
     * @param {number} n The sum of all partials
     *
     * @return {number} The entropy
     */
    static calcEntropy(k, n) {
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
        console.log(action, actions[index], action == actions[index])
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

//testGolfExample()

function testAppleGkExample() {
    // Data from https://developer.apple.com/documentation/gameplaykit/gkdecisiontree?language=objc#1965709
    let examples = [
        ["electric", 10, "true"],
        ["electric", 30, "false"],
        ["electric", 40, "true"],
        ["fire", 20, "false"],
        ["fire", 30, "false"],
        ["water", 50, "true"],
        ["water", 40, "false"],
    ]
    let actions = [
        "psychic Strike",
        "pound",
        "barrier",
        "pound",
        "tackle",
        "pound",
        "tackle",
    ]
    let attributes = [
        "type", 
        "hp", 
        "special"
    ]
    testCreateWithExamples(examples, actions, attributes)
}

testAppleGkExample()