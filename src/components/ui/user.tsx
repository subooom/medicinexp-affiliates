const users = [
  { id: 1, name: "John", active: true },
  { id: 2, name: "Sam", active: false },
  { id: 3, name: "Alex", active: true }
];


const activeUsers = users.filter(user => user.active)

console.log(activeUsers)

const activeUsersName = activeUsers.map(item => item.name)

console.log(activeUsersName)


const arr = [1, 2, 2, 3, 4, 4, 5];

const numberSet = new Set(arr);

console.log(Array.from(numberSet))
