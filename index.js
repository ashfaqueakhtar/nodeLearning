console.log("Hello World");

var add = (a, b) => {
    return a + b;
}

//Type 1
var a = 5.
var b = 4
var result = add(a,b);
console.log("So we have "+a+" + "+b+" = "+result);

//Type 2 
function comment(x) {
  console.log("Hello " + x + " !");
}
comment("world");

//Type 3 - Async and Await
async function serverSideOperation(){
    console.log("operation started");
    return new Promise(resolve => {
        setTimeout(()=>{
            resolve("operation completed");
        },2000);
    });
}

async function asyncCall() {
  console.log("Api calling");
  const result = await serverSideOperation();
  console.log(result);
  console.log("Api calling");
}

asyncCall();