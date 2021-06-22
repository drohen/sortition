export const cli = `
sortition CLI

deno run src/sortition.ts { arguments }

Arguments:
	
	--development			Development mode for local deployment (default)
	
	--test				Test mode for generating files without running server
	
	--production			Production mode for running sortition on a server
	
	--dir="<file path>"		Set directory for saving files, e.g. ~/.sortition
	
	--port="<port>"			Port for running sortition app, e.g. 8080

	--configure			Generate templates for nginx and system services to run server
					Development mode will work on Linux / OS X and only run nginx
					Test mode will only output configuration files
					Production mode works only on Linux and run nginx and systemd services
	
	--nginx="<port>"		Port that nginx will be exposed on, e.g. 80
	
	--host="<host/ip>"		Address that will be used to access nginx, e.g. example.com
	
	--conf="<file name>"		Name of nginx configuration file, default is sortition_nginx
	
	--service="<file name>"		Name of service file, default is sortition_server
	
	--help				Show this information screen
`