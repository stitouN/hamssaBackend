class employee{
   employeeName:string;

constructor(employeeName:string){
    this.employeeName=employeeName;
}
greet(){
    console.log(this.employeeName);
}
};

class manager extends employee{

    constructor(employeeName:string){
        super(employeeName);
    }
    delegateWork(){
        console.log('test');
    }
};

let empl=new employee('Najlaa');
console.log(empl.employeeName);
empl.greet();

let manage=new manager('Stitou');
console.log(manage.employeeName);
manage.delegateWork();
manage.greet();