const userRouter = require('./src/routes/user/user');

console.log('User router routes:');
userRouter.stack.forEach((route, index) => {
    console.log(`${index + 1}. ${route.methods.join(', ')} ${route.path}`);
});
