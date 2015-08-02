app.factory('asanaService', function ($q, timeService, $rootScope) {
  var self = this;
  this.data = {
    tasks: [],
    taskCountByHourArr: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  };
  // get token from cookie
  var token = document.cookie.split('token=')[1].split(';')[0]
  console.log('token:',token);

  function updateTasksAndDigest(taskDetails){
    console.log('adding',taskDetails,'to',self.data.tasks);
    var hour = Number(taskDetails.split('T')[1].split(':')[0]);
    var count = self.data.taskCountByHourArr[hour] + 1;
    self.data.taskCountByHourArr[hour] = count;
    // angular.copy(self.data.taskCountByHourArr, self.data.taskCountByHourArr);
    $rootScope.$digest();
  }

  if(token === 'test_token'){
    var allCompletedAt = ["2015-08-02T00:22:37.110Z", "2015-08-02T00:22:42.034Z", "2015-08-02T00:22:44.530Z", "2015-08-02T00:22:46.213Z", "2015-08-02T00:22:39.606Z", "2015-08-01T19:17:16.223Z", "2015-08-01T19:17:17.920Z", "2015-08-01T19:17:20.764Z", "2015-08-01T19:17:21.681Z", "2015-08-01T19:17:23.948Z", "2015-08-01T19:17:27.066Z"];
    var interval = setInterval(function(){
      if(allCompletedAt.length > 0){
        updateTasksAndDigest(allCompletedAt.pop());
      } else {
        clearInterval(interval);
      }
    }, 500);
  } else {
    var client = Asana.Client.create()
    client.useOauth({ credentials: token })

    // TODO take all workspaces, filter by completed by user, map timestamp

    client.users.me().then(function (user) {
      var taskParams = {}
      taskParams.workspaces = user.workspaces
      console.log('user.workspaces',user.workspaces);
      taskParams.userId = user.id
      console.log("user:", user);
      return taskParams
    }).then(function (params) {

      var promises = _.map(params.workspaces, function (workspace) {
        var workspaceTasks = []
        var deferredCollection = $q.defer()
        client.tasks.findAll({
          assignee: params.userId,
          workspace: workspace.id,
          limit: 5
        }).then(function (collection) {
          collection.stream().on('data', function (task) {
            var deferredTask = $q.defer();
            client.tasks.findById(task.id)
              .then(function (taskDetails) {
                deferredTask.resolve(taskDetails)
                workspaceTasks.push(taskDetails)
                updateTasksAndDigest(taskDetails);
              })
          }).on('end', function () {
            deferredCollection.resolve(workspaceTasks)
          })
        })
        return deferredCollection.promise;
      })

      $q.all(promises).then(function (allTasksByWorkspace) {
        var allTasks = _.flatten(allTasksByWorkspace);
        var allCompletedAt = allTasks.map(function(task){
          return task.completed_at;
        }).filter(function (completed_at) {
          return !!completed_at;
        });
        console.log("allCompletedAt: ", allCompletedAt);
        var temp = timeService.parseTimes(allCompletedAt);
        console.log("temp: ", temp);
        response.tasks.concat(allCompletedAt);
      })
    })
  }

  return this.data;
})