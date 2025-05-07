# baby-name-charts

This is an application that will allow you to chart how many babies are born with a given name in a given year over time in the United States according to SSA data. 

The data is stored in a JSON file in the following format:

```
{
  "Mary": {
    "M": {
      "1880": 27,
      "1881": 29,
      "1882": 30,
      "1883": 32,
      "1884": 36,
      "1885": 38,
      "1886": 32,
   },
   "F": {
      "1880": 229,
...
```

The UI should have a search box that allows you to pick multiple (name/Gender combos). For example, if I type "Mary", I should be able to pick "Mary (F)" or "Mary (M)", and I should be able to pick both and chart both against eachother. I should also be able to select "Mary (combined)", and that will chart the sum of male and female Marys for each year.  

The chart should be a dynamic JavaScript chart that allows you to limit the time range. The granularity is years, and not every name will have baby names in continuity. 

The application should store state in the URL, to allow users to share URLs. 

Charts can be built with Plotly or Chartly, should be FOSS, license free, etc. 

This is partially me trying to build a web version of the command line script I used for this this:
```
grep -R "Felix,M" | sort | sed -e "s/\.\/yob//" |  sed -e "s/.txt:/,/" | sed -e "s/,[M,F],/,/" | sed -e "s/,.*,/,/" | uplot bar -d,%
```
