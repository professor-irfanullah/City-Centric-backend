const errorGenerator = (text, stat = 500) => {
    const err = new Error(text)
    err.statusCode = stat
    return err
}
module.exports = { errorGenerator }