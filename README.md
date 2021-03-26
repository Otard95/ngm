# Nested GIT Manager

Manage projects and features within a nested git repositories

## Install

Currently only an executable is provided(See releases).
So you'll need to move it to wherever you want it and set
up a alias or add it to your path manually.

### From source

If you on the other hand would like to build from source,
just clone the repository then:

```bash
$ npm i
$ npm run build:prod
```

This will create the directory `build/prod` with the file `ngm.js`
which you can run with `node`. This is a bundle including all necessary
modules, so it can be moved out of the project and executed form anywhere.
From here its up to you what you want to do. One option is to create an
alias for executing the file with node, another would be to package the
script with something like [pkg](https://github.com/vercel/pkg).

## TODO

### Bugfixes

- [ ] Checkout command - error messages doesn't display

### Features

- [ ] Project command - add remove option
- [ ] Project command - add aliases for example `ngm p new` in place of `ngm project create`, and more
- [ ] More git commands
- [ ] Bash completion
