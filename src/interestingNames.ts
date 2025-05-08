// Array of interesting name selections for the "Load an interesting name" feature
// Each entry matches the structure of the URL hash (permalink) state

const interestingNames: { names: { name: string; gender: 'M' | 'F' }[] }[] = [
    { names: [{ name: 'Kobe', gender: 'M' }] },
    { names: [{ name: 'Zendaya', gender: 'F' }] },
    { names: [{ name: 'Beyoncé', gender: 'F' }] },
    { names: [{ name: 'Adele', gender: 'F' }] },
    { names: [{ name: 'Rihanna', gender: 'F' }] },
    { names: [{ name: 'Drake', gender: 'M' }] },
    { names: [{ name: 'Shakira', gender: 'F' }] },
    { names: [{ name: 'Oprah', gender: 'F' }] },
    { names: [{ name: 'Elvis', gender: 'M' }] },
    { names: [{ name: 'Cher', gender: 'F' }] },
    { names: [{ name: 'Arya', gender: 'F' }] },
    { names: [{ name: 'Khaleesi', gender: 'F' }] },
    { names: [{ name: 'Neo', gender: 'M' }] },
    { names: [{ name: 'Elsa', gender: 'F' }] },
    { names: [{ name: 'Anakin', gender: 'M' }] },
    { names: [{ name: 'Kylo', gender: 'M' }] },
    { names: [{ name: 'Bella', gender: 'F' }] },
    { names: [{ name: 'Jasmine', gender: 'F' }] },
    { names: [{ name: 'Xena', gender: 'F' }] },
    { names: [{ name: 'Dexter', gender: 'M' }] },
    { names: [{ name: 'Shaquille', gender: 'M' }] },
    { names: [{ name: 'Jalen', gender: 'M' }] },
    { names: [{ name: 'LeBron', gender: 'M' }] },
    { names: [{ name: 'Tiger', gender: 'M' }] },
    { names: [{ name: 'Serena', gender: 'F' }, { name: 'Venus', gender: 'F' }] },
    { names: [{ name: 'Giannis', gender: 'M' }] },
    { names: [{ name: 'Adolf', gender: 'M' }] },
    { names: [{ name: 'Monica', gender: 'F' }] },
    { names: [{ name: 'Hillary', gender: 'F' }] },
    { names: [{ name: 'Isis', gender: 'F' }] },
    { names: [{ name: 'Katrina', gender: 'F' }] },
    { names: [{ name: 'Osama', gender: 'M' }] },
    { names: [{ name: 'Chad', gender: 'M' }] },
    { names: [{ name: 'Greta', gender: 'F' }] },
    { names: [{ name: 'Elon', gender: 'M' }] },
    { names: [{ name: 'Barack', gender: 'M' }] },
    { names: [{ name: 'Melania', gender: 'F' }] },
    { names: [{ name: 'Lennon', gender: 'M' }] },
    { names: [{ name: 'Marley', gender: 'F' }] },
    { names: [{ name: 'Nirvana', gender: 'F' }] },
    { names: [{ name: 'Tupac', gender: 'M' }] },
    { names: [{ name: 'Draven', gender: 'M' }] },
    { names: [{ name: 'Apple', gender: 'F' }] },
    { names: [{ name: 'North', gender: 'F' }] },
    { names: [{ name: 'Blue', gender: 'F' }] },
    { names: [{ name: 'Saint', gender: 'M' }] },
    {
      names: [
        { name: 'Jamie', gender: 'F' },
        { name: 'Jamie', gender: 'M' },
      ],
    },
    {
        names: [
          { name: 'Ashley', gender: 'F' },
          { name: 'Ashley', gender: 'M' },
        ],
      },
      {
        names: [
          { name: 'Jordan', gender: 'F' },
          { name: 'Jordan', gender: 'M' },
        ],
      },
      {
        names: [
          { name: 'Taylor', gender: 'F' },
          { name: 'Taylor', gender: 'M' },
        ],
      },
    
      // 2. The Beatles
      {
        names: [
          { name: 'John', gender: 'M' },
          { name: 'Paul', gender: 'M' },
          { name: 'George', gender: 'M' },
          { name: 'Ringo', gender: 'M' },
        ],
      },
    
      // 3. Spice Girls (peak late '90s)
      {
        names: [
          { name: 'Melanie', gender: 'F' },
          { name: 'Emma', gender: 'F' },
          { name: 'Victoria', gender: 'F' },
          { name: 'Geri', gender: 'F' },
        ],
      },
    
      // 4. Top 2000s pop stars (who likely drove surges)
      {
        names: [
          { name: 'Britney', gender: 'F' },
          { name: 'Christina', gender: 'F' },
          { name: 'Jessica', gender: 'F' },
          { name: 'Mandy', gender: 'F' },
        ],
      },
    
      // 5. Ninja Turtles (pop culture quartet, early '90s boom)
      {
        names: [
          { name: 'Leonardo', gender: 'M' },
          { name: 'Raphael', gender: 'M' },
          { name: 'Donatello', gender: 'M' },
          { name: 'Michelangelo', gender: 'M' },
        ],
      },
    
      // 6. Star Wars female name waves
      {
        names: [
          { name: 'Leia', gender: 'F' },
          { name: 'Padmé', gender: 'F' },
          { name: 'Rey', gender: 'F' },
        ],
      },
    
      // 7. Biblical names that surged for both genders in different eras
      {
        names: [
          { name: 'Noah', gender: 'M' },
          { name: 'Noa', gender: 'F' },
        ],
      },
    
      // 8. 90s sitcom trio
      {
        names: [
          { name: 'Chandler', gender: 'M' },
          { name: 'Ross', gender: 'M' },
          { name: 'Joey', gender: 'M' },
        ],
      },
    
      // 9. Celebrity baby name boom (Kardashian/West kids)
      {
        names: [
          { name: 'North', gender: 'F' },
          { name: 'Saint', gender: 'M' },
          { name: 'Chicago', gender: 'F' },
          { name: 'Psalm', gender: 'M' },
        ],
      },
    
      // 10. Names that were male but became trendy for girls
      {
        names: [
          { name: 'Avery', gender: 'F' },
          { name: 'Avery', gender: 'M' },
          { name: 'Riley', gender: 'F' },
          { name: 'Riley', gender: 'M' },
        ],
      },
  ];
  
export default interestingNames; 