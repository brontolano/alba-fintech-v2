(function(){try{
  var w=window;
  if(!w.performance||!w.performance.now||!w.performance.timing){
    w.performance=Object.assign(w.performance||{},{
      now:function(){return Date.now()},
      mark:function(){return {}},
      measure:function(){return {}},
      clearMarks:function(){},
      clearMeasures:function(){},
      getEntries:function(){return []},
      getEntriesByName:function(){return []},
      getEntriesByType:function(){return []},
      clearResourceTimings:function(){},
      setResourceTimingsBufferSize:function(){},
      timing:{navigationStart:Date.now()}
    });
  }
}catch(e){}})();